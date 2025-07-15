import React, { useState, useEffect } from 'react';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA8CsoQ1sDQYZEpvtBd_eVq25q3E6cpmcg",
  authDomain: "kpi-srinarong.firebaseapp.com",
  projectId: "kpi-srinarong",
  storageBucket: "kpi-srinarong.firebasestorage.app",
  messagingSenderId: "814805735999",
  appId: "1:814805735999:web:179c0f2122ae5cc139768a",
  measurementId: "G-FGNJJ1M0WV"
};

const appId = firebaseConfig.projectId;

function App() {
  const [db, setDb] = useState(null);
  // Removed [auth, setAuth] as these state variables were not used directly in JSX or other functions.
  // The firebaseAuth instance is now purely local to the useEffect.
  const [userId, setUserId] = useState('');
  const [kpis, setKpis] = useState([]);
  const [newKpiName, setNewKpiName] = useState('');
  const [newKpiTarget, setNewKpiTarget] = useState('');
  const [newKpiActual, setNewKpiActual] = useState('');
  const [newKpiDate, setNewKpiDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingKpiId, setEditingKpiId] = useState(null);
  const [kpiAnalysis, setKpiAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Effect for Firebase initialization and authentication state monitoring
  useEffect(() => {
    const initFirebase = async () => {
      try {
        const appInstance = initializeApp(firebaseConfig); // Renamed to avoid confusion with global 'app' if it existed
        const firestoreDb = getFirestore(appInstance);
        const firebaseAuth = getAuth(appInstance); // Local instance of auth

        setDb(firestoreDb);
        // No need to setAuth to state if 'auth' state variable is not used elsewhere.

        // Monitor authentication state
        const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
          if (user) {
            setUserId(user.uid);
            setLoading(false);
          } else {
            try {
                await signInAnonymously(firebaseAuth); // Use the local firebaseAuth instance
            } catch (authError) {
              console.error("Firebase Auth Error:", authError);
              setError("ไม่สามารถเข้าสู่ระบบ Firebase ได้: " + authError.message);
              setLoading(false);
            }
          }
        });

        return () => unsubscribe();
      } catch (err) {
        console.error("Firebase Initialization Error:", err);
        setError("ไม่สามารถเริ่มต้น Firebase ได้: " + err.message);
        setLoading(false);
      }
    };

    initFirebase();
  }, []); // Empty dependency array, runs once on mount

  // Effect for fetching KPI data in real-time
  useEffect(() => {
    if (db && userId) {
      const kpiCollectionRef = collection(db, `artifacts/${appId}/public/data/kpis`);
      const q = query(kpiCollectionRef);

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const kpiList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        kpiList.sort((a, b) => (b.date ? b.date.seconds : 0) - (a.date ? a.date.seconds : 0));
        setKpis(kpiList);
        setLoading(false);
      }, (err) => {
        console.error("Firestore Snapshot Error:", err);
        setError("ไม่สามารถดึงข้อมูล KPI ได้: " + err.message);
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [db, userId]); // Removed appId as dependency because it's a constant.

  const addKpi = async () => {
    if (!newKpiName || !newKpiTarget || !newKpiActual || !newKpiDate) {
      setError("กรุณากรอกข้อมูล KPI ให้ครบถ้วน");
      return;
    }
    if (isNaN(newKpiTarget) || isNaN(newKpiActual)) {
      setError("เป้าหมายและค่าจริงต้องเป็นตัวเลข");
      return;
    }

    if (db && userId) {
      try {
        const kpiCollectionRef = collection(db, `artifacts/${appId}/public/data/kpis`);
        await addDoc(kpiCollectionRef, {
          name: newKpiName,
          target: parseFloat(newKpiTarget),
          actual: parseFloat(newKpiActual),
          date: new Date(newKpiDate),
          createdAt: serverTimestamp()
        });
        setNewKpiName('');
        setNewKpiTarget('');
        setNewKpiActual('');
        setNewKpiDate('');
        setKpiAnalysis('');
        setError('');
      } catch (e) {
        console.error("Error adding document: ", e);
        setError("ไม่สามารถเพิ่ม KPI ได้: " + e.message);
      }
    } else {
      setError("ระบบยังไม่พร้อม กรุณารอสักครู่");
    }
  };

  const startEditKpi = (kpi) => {
    setEditingKpiId(kpi.id);
    setNewKpiName(kpi.name);
    setNewKpiTarget(kpi.target);
    setNewKpiActual(kpi.actual);
    const kpiDate = kpi.date ? new Date(kpi.date.seconds * 1000) : new Date();
    setNewKpiDate(kpiDate.toISOString().split('T')[0]);
    setError('');
  };

  const updateKpi = async () => {
    if (!editingKpiId || !newKpiName || !newKpiTarget || !newKpiActual || !newKpiDate) {
      setError("กรุณากรอกข้อมูล KPI ให้ครบถ้วนสำหรับการแก้ไข");
      return;
    }
    if (isNaN(newKpiTarget) || isNaN(newKpiActual)) {
      setError("เป้าหมายและค่าจริงต้องเป็นตัวเลข");
      return;
    }

    if (db && userId) {
      try {
        const kpiDocRef = doc(db, `artifacts/${appId}/public/data/kpis`, editingKpiId);
        await updateDoc(kpiDocRef, {
          name: newKpiName,
          target: parseFloat(newKpiTarget),
          actual: parseFloat(newKpiActual),
          date: new Date(newKpiDate),
        });
        setEditingKpiId(null);
        setNewKpiName('');
        setNewKpiTarget('');
        setNewKpiActual('');
        setNewKpiDate('');
        setKpiAnalysis('');
        setError('');
      } catch (e) {
        console.error("Error updating document: ", e);
        setError("ไม่สามารถอัปเดต KPI ได้: " + e.message);
      }
    } else {
      setError("ระบบยังไม่พร้อม กรุณารอสักครู่");
    }
  };

  const cancelEdit = () => {
    setEditingKpiId(null);
    setNewKpiName('');
    setNewKpiTarget('');
    setNewKpiActual('');
    setNewKpiDate('');
    setError('');
  };

  const analyzeKpis = async () => {
    setIsAnalyzing(true);
    setKpiAnalysis('');
    setError('');

    if (kpis.length === 0) {
        setError("ไม่มีข้อมูล KPI ให้วิเคราะห์ กรุณาเพิ่ม KPI ก่อน");
        setIsAnalyzing(false);
        return;
    }

    const kpiDataForPrompt = kpis.map(kpi => ({
        name: kpi.name,
        target: kpi.target,
        actual: kpi.actual,
        status: kpi.actual >= kpi.target ? 'บรรลุเป้าหมาย' : 'ไม่บรรลุเป้าหมาย'
    }));

    const prompt = `Given the following Key Performance Indicators (KPIs) for a hospital, analyze their performance. For each KPI, identify if it met its target. For KPIs that did not meet their target, provide a brief potential reason or a general suggestion for improvement.
    KPI Data:
    ${JSON.stringify(kpiDataForPrompt, null, 2)}
    
    Please provide the analysis in Thai, in a clear and concise manner, focusing on actionable insights where targets are not met.`;

    try {
        let chatHistory = [];
        chatHistory.push({ role: "user", parts: [{ text: prompt }] });
        const payload = { contents: chatHistory };
        // Gemini API Key is provided by Canvas environment, leave it as empty string
        const geminiApiKey = "";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            const text = result.candidates[0].content.parts[0].text;
            setKpiAnalysis(text);
        } else {
            setError("ไม่สามารถวิเคราะห์ KPI ได้: โครงสร้างการตอบกลับจาก LLM ไม่ถูกต้อง");
        }
    } catch (apiError) {
        console.error("Gemini API Error:", apiError);
        setError("เกิดข้อผิดพลาดในการเรียกใช้ Gemini API: " + apiError.message);
    } finally {
        setIsAnalyzing(false);
    }
  };


  // Calculate data for the dashboard summary
  const totalKpis = kpis.length;
  const achievedKpis = kpis.filter(kpi => kpi.actual >= kpi.target).length;
  const notAchievedKpis = totalKpis - achievedKpis;

  // Prepare data for the chart
  const chartData = kpis.map(kpi => ({
    name: kpi.name,
    เป้าหมาย: kpi.target,
    ค่าจริง: kpi.actual,
  }));
  

  // Display loading message while Firebase is initializing or data is being fetched
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-xl font-semibold text-gray-700">กำลังโหลด...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-inter">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-6 md:p-8">
        <h1 className="text-3xl font-bold text-center text-blue-800 mb-6">
          โปรแกรมเก็บตัวชี้วัด KPI โรงพยาบาลศรีณรงค์ (เวอร์ชันสำหรับใช้งานร่วมกัน)
        </h1>

        {/* Display error messages */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {/* KPI Dashboard Section - Matches the top section of the image */}
        <div className="mb-8 p-4 border border-gray-200 rounded-lg bg-blue-50">
          <h2 className="text-2xl font-semibold text-blue-700 mb-4 text-center">ภาพรวม KPI</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center mb-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-200">
              <p className="text-sm text-gray-600">KPI ทั้งหมด</p>
              <p className="text-3xl font-bold text-blue-600">{totalKpis}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-green-200">
              <p className="text-sm text-gray-600">บรรลุเป้าหมาย</p>
              <p className="text-3xl font-bold text-green-600">{achievedKpis}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-red-200">
              <p className="text-sm text-gray-600">ไม่บรรลุเป้าหมาย</p>
              <p className="text-3xl font-bold text-red-600">{notAchievedKpis}</p>
            </div>
          </div>

          <h3 className="text-xl font-semibold text-gray-700 mb-3 text-center">ประสิทธิภาพ KPI</h3>
          {kpis.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={chartData}
                margin={{
                  top: 5, right: 30, left: 20, bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-15} textAnchor="end" interval={0} height={60} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="เป้าหมาย" fill="#8884d8" name="เป้าหมาย" radius={[10, 10, 0, 0]} />
                <Bar dataKey="ค่าจริง" fill="#82ca9d" name="ค่าจริง" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center">เพิ่มข้อมูล KPI เพื่อดูกราฟ</p>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={analyzeKpis}
              disabled={isAnalyzing || kpis.length === 0}
              className={`bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105 ${isAnalyzing || kpis.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isAnalyzing ? 'กำลังวิเคราะห์...' : ' วิเคราะห์ KPI '}
            </button>
          </div>

          {kpiAnalysis && (
            <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold text-purple-700 mb-3">ผลการวิเคราะห์ KPI</h3>
              <p className="text-gray-800 whitespace-pre-wrap">{kpiAnalysis}</p>
            </div>
          )}
        </div>

        {/* Add/Edit KPI Form Section - Matches the "เพิ่ม KPI ใหม่" section of the image */}
        <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            {editingKpiId ? 'แก้ไข KPI' : 'เพิ่ม KPI ใหม่'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Row 1 */}
            <div>
              <label htmlFor="kpiName" className="block text-sm font-medium text-gray-700 mb-1">
                ชื่อตัวชี้วัด
              </label>
              <input
                type="text"
                id="kpiName"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={newKpiName}
                onChange={(e) => setNewKpiName(e.target.value)}
                placeholder="เช่น อัตราการครองเตียง"
              />
            </div>
            <div>
              <label htmlFor="kpiTarget" className="block text-sm font-medium text-gray-700 mb-1">
                เป้าหมาย
              </label>
              <input
                type="number"
                id="kpiTarget"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={newKpiTarget}
                onChange={(e) => setNewKpiTarget(e.target.value)}
                placeholder="เช่น 85 (เป็น % หรือจำนวน)"
              />
            </div>
            {/* Row 2 */}
            <div>
              <label htmlFor="kpiActual" className="block text-sm font-medium text-gray-700 mb-1">
                ค่าจริง
              </label>
              <input
                type="number"
                id="kpiActual"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={newKpiActual}
                onChange={(e) => setNewKpiActual(e.target.value)}
                placeholder="เช่น 82.5"
              />
            </div>
            <div>
              <label htmlFor="kpiDate" className="block text-sm font-medium text-gray-700 mb-1">
                วันที่
              </label>
              <input
                type="date"
                id="kpiDate"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={newKpiDate}
                onChange={(e) => setNewKpiDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-4 mt-6">
            {editingKpiId ? (
              <>
                <button
                  onClick={updateKpi}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105"
                >
                  บันทึกการแก้ไข
                </button>
                <button
                  onClick={cancelEdit}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105"
                >
                  ยกเลิก
                </button>
              </>
            ) : (
              <button
                onClick={addKpi}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105"
              >
                เพิ่ม KPI
              </button>
            )}
          </div>
        </div>

        {/* KPI List Section - Remains below the input forms */}
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">รายการ KPI</h2>
        {kpis.length === 0 ? (
          <p className="text-gray-500 text-center">ยังไม่มีข้อมูล KPI เพิ่มข้อมูลเพื่อเริ่มต้น</p>
        ) : (
          <div className="overflow-x-auto rounded-lg shadow-md">
            <table className="min-w-full divide-y divide-gray-200">
              
              <thead className="bg-blue-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider rounded-tl-lg">
                    ชื่อตัวชี้วัด
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    เป้าหมาย
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ค่าจริง
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    วันที่
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    สถานะ
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider rounded-tr-lg">
                    การดำเนินการ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {kpis.map((kpi) => (
                  <tr key={kpi.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {kpi.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {kpi.target}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {kpi.actual}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {kpi.date ? new Date(kpi.date.seconds * 1000).toLocaleDateString('th-TH') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {kpi.actual >= kpi.target ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          บรรลุเป้าหมาย
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          ไม่บรรลุเป้าหมาย
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => startEditKpi(kpi)}
                        className="text-indigo-600 hover:text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md py-1 px-2 transition duration-150 ease-in-out"
                      >
                        แก้ไข
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* User ID and Footer */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>รหัสผู้ใช้ (User ID): <span className="font-mono text-blue-700 break-all">{userId}</span></p>
          <p className="mt-2">ข้อมูลถูกจัดเก็บแบบเรียลไทม์ด้วย Firebase Firestore</p>
        </div>
      </div>
    </div>
  );
  
}
export default App;