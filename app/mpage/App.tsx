import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  BarChart3, 
  AlertTriangle, 
  Download, 
  Settings, 
  Bell,
  Activity,
  Zap,
  Waves,
  Cpu,
  Menu,
  X,
  ChevronRight,
  FileJson,
  FileText
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { generateMockData, generateAnomalies, THRESHOLDS, STATIONS, PowerData, Anomaly } from './types';
import { cn } from './lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';

// --- Components ---

const Card = ({ children, title, className, icon: Icon }: { children: React.ReactNode, title?: string, className?: string, icon?: any }) => (
  <div className={cn("bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden", className)}>
    {title && (
      <div className="px-4 py-3 border-bottom border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          {Icon && <Icon size={16} className="text-slate-400" />}
          {title}
        </h3>
      </div>
    )}
    <div className="p-4">{children}</div>
  </div>
);

const StatItem = ({ label, value, unit, icon: Icon, colorClass }: { label: string, value: string | number, unit: string, icon: any, colorClass: string }) => (
  <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
    <div className={cn("p-3 rounded-lg", colorClass)}>
      <Icon size={24} className="text-white" />
    </div>
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-slate-900">{value}</span>
        <span className="text-xs font-medium text-slate-400">{unit}</span>
      </div>
    </div>
  </div>
);

const StatusIndicator: React.FC<{ status: 'normal' | 'abnormal', label: string }> = ({ status, label }) => (
  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
    <span className="text-sm font-medium text-slate-700">{label}</span>
    <div className="flex items-center gap-2">
      <span className={cn(
        "w-2.5 h-2.5 rounded-full animate-pulse",
        status === 'normal' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"
      )} />
      <span className={cn(
        "text-xs font-bold uppercase",
        status === 'normal' ? "text-emerald-600" : "text-rose-600"
      )}>
        {status === 'normal' ? '正常' : '異常'}
      </span>
    </div>
  </div>
);

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analysis' | 'export' | 'diagnostics'>('dashboard');
  const [data, setData] = useState<PowerData[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showAlert, setShowAlert] = useState<Anomaly | null>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);

  useEffect(() => {
    const initialData = generateMockData(30);
    setData(initialData);
    setAnomalies(generateAnomalies(initialData));

    const interval = setInterval(() => {
      setData(prev => {
        const newDataPoint = generateMockData(1)[0];
        const updated = [...prev.slice(1), newDataPoint];
        
        // Check for new anomaly
        if (newDataPoint.status === 'abnormal') {
          const newAnomalies = generateAnomalies([newDataPoint]);
          if (newAnomalies.length > 0) {
            setAnomalies(prevAnom => [newAnomalies[0], ...prevAnom].slice(0, 50));
            setShowAlert(newAnomalies[0]);
            setTimeout(() => setShowAlert(null), 5000);
          }
        }
        return updated;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const latest = data[data.length - 1] || { voltage: 0, current: 0, frequency: 0, powerFactor: 0, power: 0, status: 'normal' };

  const exportCSV = () => {
    const csv = Papa.unparse(data);
    // Add UTF-8 BOM (\uFEFF) to fix garbled characters in Excel
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `power_report_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    // Note: jsPDF default fonts do not support Chinese characters. 
    // Switching to English for PDF export to prevent garbled text.
    const doc = new jsPDF();
    doc.text('Power Quality Monitoring Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Export Time: ${new Date().toLocaleString()}`, 14, 22);
    
    autoTable(doc, {
      startY: 30,
      head: [['Time', 'Station', 'Voltage(V)', 'Current(A)', 'Freq(Hz)', 'PF', 'Status']],
      body: data.map(d => [
        new Date(d.timestamp).toLocaleString(),
        d.stationId,
        d.voltage,
        d.current,
        d.frequency,
        d.powerFactor,
        d.status === 'normal' ? 'Normal' : 'Abnormal'
      ]),
    });
    
    doc.save(`power_report_${new Date().toISOString()}.pdf`);
  };

  const pieData = STATIONS.map(station => ({
    name: station,
    value: anomalies.filter(a => a.stationId === station).length
  })).filter(d => d.value > 0);

  // If no anomalies yet, show a balanced empty state or mock some for visual
  const displayPieData = pieData.length > 0 ? pieData : STATIONS.map((s, i) => ({ name: s, value: [1, 2, 8, 3][i] }));

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e'];

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        className="bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 z-30"
      >
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shrink-0">
            <Zap size={20} className="text-white" />
          </div>
          {isSidebarOpen && <span className="font-bold text-white text-lg tracking-tight">PowerGuard</span>}
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all text-left",
              activeTab === 'dashboard' ? "bg-indigo-600 text-white" : "hover:bg-slate-800 hover:text-white"
            )}
          >
            <LayoutDashboard size={20} />
            {isSidebarOpen && <span className="font-medium">即時儀表板</span>}
          </button>
          <button 
            onClick={() => setActiveTab('analysis')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all text-left",
              activeTab === 'analysis' ? "bg-indigo-600 text-white" : "hover:bg-slate-800 hover:text-white"
            )}
          >
            <BarChart3 size={20} />
            {isSidebarOpen && <span className="font-medium">數據趨勢分析</span>}
          </button>
          <button 
            onClick={() => setActiveTab('export')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all text-left",
              activeTab === 'export' ? "bg-indigo-600 text-white" : "hover:bg-slate-800 hover:text-white"
            )}
          >
            <Download size={20} />
            {isSidebarOpen && <span className="font-medium">報表匯出</span>}
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800">
              {activeTab === 'dashboard' && '即時電力監測'}
              {activeTab === 'analysis' && '歷史趨勢分析'}
              {activeTab === 'export' && '數據匯出中心'}
              {activeTab === 'diagnostics' && '異常診斷報告'}
            </h2>
            <div className="h-4 w-px bg-slate-200 mx-2" />
            <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">
              {new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Bell size={20} className="text-slate-400 cursor-pointer hover:text-indigo-600 transition-colors" />
              {anomalies.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white">
                  {anomalies.length > 9 ? '9+' : anomalies.length}
                </span>
              )}
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(process.env.USER_EMAIL || 'user')}`} alt="avatar" />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatItem label="電壓 (Voltage)" value={latest.voltage} unit="V" icon={Activity} colorClass="bg-blue-500" />
                  <StatItem label="電流 (Current)" value={latest.current} unit="A" icon={Zap} colorClass="bg-amber-500" />
                  <StatItem label="頻率 (Frequency)" value={latest.frequency} unit="Hz" icon={Waves} colorClass="bg-indigo-500" />
                  <StatItem label="功率因數 (PF)" value={latest.powerFactor} unit="" icon={Cpu} colorClass="bg-emerald-500" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Real-time Chart */}
                  <Card title="輸入 vs 輸出功率波形比較" className="lg:col-span-2" icon={Activity}>
                    <div className="h-[300px] w-full bg-white">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                          <defs>
                            <linearGradient id="colorInput" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="timestamp" hide />
                          <YAxis domain={['auto', 'auto']} stroke="#94a3b8" fontSize={12} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                            labelFormatter={(label) => new Date(label).toLocaleTimeString()}
                          />
                          <Legend verticalAlign="top" height={36}/>
                          <Area type="monotone" dataKey="inputPower" stroke="#06b6d4" fillOpacity={1} fill="url(#colorInput)" strokeWidth={3} name="輸入功率 (Grid)" />
                          <Area type="monotone" dataKey="power" stroke="#f43f5e" fillOpacity={1} fill="url(#colorOutput)" strokeWidth={3} name="輸出功率 (Load)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  {/* Status & Notifications */}
                  <div className="space-y-6">
                    <Card title="站點狀態" icon={Settings}>
                      <div className="space-y-3">
                        {STATIONS.map(s => (
                          <StatusIndicator 
                            key={s} 
                            label={s} 
                            status={data.find(d => d.stationId === s)?.status || 'normal'} 
                          />
                        ))}
                      </div>
                    </Card>

                    <Card title="最新通知" icon={Bell}>
                      <div className="space-y-4 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                        {anomalies.length === 0 ? (
                          <p className="text-center text-slate-400 py-8 text-sm italic">目前無異常記錄</p>
                        ) : (
                          anomalies.slice(0, 5).map((anom) => (
                            <div 
                              key={anom.id} 
                              onClick={() => { setSelectedAnomaly(anom); setActiveTab('diagnostics'); }}
                              className="flex gap-3 items-start p-2 rounded-lg hover:bg-slate-50 transition-colors border-l-2 border-rose-500 cursor-pointer group"
                            >
                              <div className="p-1.5 bg-rose-100 rounded text-rose-600 shrink-0 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                                <AlertTriangle size={14} />
                              </div>
                              <div className="flex-1">
                                <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{anom.message}</p>
                                <p className="text-[10px] text-slate-400 mt-1">
                                  {new Date(anom.timestamp).toLocaleTimeString()} • {anom.stationId}
                                </p>
                              </div>
                              <ChevronRight size={12} className="text-slate-300 self-center opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          ))
                        )}
                      </div>
                    </Card>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'analysis' && (
              <motion.div 
                key="analysis"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card title="電壓與電流長期趨勢 (廣域波動)" icon={Activity}>
                    <div className="h-[300px] bg-white">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="timestamp" hide />
                          <YAxis yAxisId="left" stroke="#3b82f6" fontSize={12} label={{ value: 'V', angle: -90, position: 'insideLeft' }} />
                          <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" fontSize={12} label={{ value: 'A', angle: 90, position: 'insideRight' }} />
                          <Tooltip />
                          <Legend verticalAlign="top" height={36}/>
                          <Line yAxisId="left" type="monotone" dataKey="voltage" stroke="#3b82f6" strokeWidth={2} dot={false} name="電壓 (V)" />
                          <Line yAxisId="right" type="monotone" dataKey="current" stroke="#f59e0b" strokeWidth={2} dot={false} name="電流 (A)" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  <Card title="各站點功率比較" icon={BarChart3}>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={STATIONS.map(s => ({ 
                          name: s, 
                          power: data.filter(d => d.stationId === s).reduce((acc, curr) => acc + curr.power, 0) / (data.filter(d => d.stationId === s).length || 1)
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                          <YAxis stroke="#94a3b8" fontSize={12} />
                          <Tooltip />
                          <Bar dataKey="power" fill="#6366f1" radius={[4, 4, 0, 0]} name="平均功率 (kW)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  <Card title="監測站異常比例 (權重化分析)" icon={AlertTriangle}>
                    <div className="h-[300px] flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={displayPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {displayPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  <Card title="輸入電壓 vs 輸出電壓波形" icon={Waves}>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="timestamp" hide />
                          <YAxis domain={['auto', 'auto']} stroke="#94a3b8" fontSize={12} />
                          <Tooltip />
                          <Legend verticalAlign="top" height={36}/>
                          <Line type="monotone" dataKey="inputVoltage" stroke="#06b6d4" strokeWidth={2} dot={false} name="輸入電壓 (Grid)" />
                          <Line type="monotone" dataKey="voltage" stroke="#f43f5e" strokeWidth={3} dot={false} name="輸出電壓 (Load)" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </div>
              </motion.div>
            )}

            {activeTab === 'export' && (
              <motion.div 
                key="export"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-4xl mx-auto space-y-8"
              >
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-slate-800">匯出分析報表</h3>
                  <p className="text-slate-500">選擇您需要的格式與時間範圍，系統將自動生成詳細的電力品質報告。</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div 
                    onClick={exportCSV}
                    className="group p-8 bg-white border-2 border-slate-100 rounded-2xl hover:border-indigo-500 hover:shadow-xl transition-all cursor-pointer flex flex-col items-center text-center gap-4"
                  >
                    <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <FileJson size={32} />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-800">CSV 數據格式</h4>
                      <p className="text-sm text-slate-500 mt-1">適用於 Excel 或數據分析工具，包含所有原始監測數值。</p>
                    </div>
                    <button className="mt-4 px-6 py-2 bg-slate-100 text-slate-700 rounded-full text-sm font-bold group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      立即下載
                    </button>
                  </div>

                  <div 
                    onClick={exportPDF}
                    className="group p-8 bg-white border-2 border-slate-100 rounded-2xl hover:border-rose-500 hover:shadow-xl transition-all cursor-pointer flex flex-col items-center text-center gap-4"
                  >
                    <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                      <FileText size={32} />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-800">PDF 視覺化報告</h4>
                      <p className="text-sm text-slate-500 mt-1">包含圖表與異常摘要，適合用於正式匯報與存檔。</p>
                    </div>
                    <button className="mt-4 px-6 py-2 bg-slate-100 text-slate-700 rounded-full text-sm font-bold group-hover:bg-rose-600 group-hover:text-white transition-colors">
                      立即下載
                    </button>
                  </div>
                </div>

                <Card title="匯出設定" icon={Settings}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">時間範圍</label>
                      <select className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                        <option>最近 24 小時</option>
                        <option>最近 7 天</option>
                        <option>最近 30 天</option>
                        <option>自定義範圍</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">資料種類</label>
                      <div className="flex flex-wrap gap-2">
                        {['電壓', '電流', '頻率', '功率因數'].map(t => (
                          <span key={t} className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold border border-indigo-100">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">包含異常記錄</label>
                      <div className="flex items-center gap-2 mt-2">
                        <input type="checkbox" defaultChecked className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                        <span className="text-sm text-slate-600">匯出時包含所有警報詳細資訊</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
            {activeTab === 'diagnostics' && selectedAnomaly && (
              <motion.div 
                key="diagnostics"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <button 
                    onClick={() => setActiveTab('dashboard')}
                    className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
                  >
                    <X size={16} /> 返回儀表板
                  </button>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-rose-100 text-rose-600 rounded-full text-xs font-bold border border-rose-200">
                      {selectedAnomaly.type} 異常
                    </span>
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold border border-slate-200">
                      {selectedAnomaly.stationId}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card title="異常診斷詳情" className="lg:col-span-1" icon={AlertTriangle}>
                    <div className="space-y-6">
                      <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
                        <p className="text-sm font-bold text-rose-900 mb-2">事件摘要</p>
                        <p className="text-sm text-rose-700 leading-relaxed">{selectedAnomaly.message}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">監測數值</p>
                          <p className="text-lg font-bold text-slate-900">{selectedAnomaly.value}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">安全閾值</p>
                          <p className="text-lg font-bold text-slate-900">{selectedAnomaly.threshold}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">診斷建議</p>
                        <ul className="space-y-2">
                          {[
                            '檢查該站點變壓器負載情況',
                            '確認線路是否有瞬時短路跡象',
                            '調閱該時段前後 5 分鐘原始數據',
                            '派員前往現場進行物理檢測'
                          ].map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                              <div className="w-1 h-1 bg-indigo-500 rounded-full mt-1.5 shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </Card>

                  <Card title="事件發生前後波形分析" className="lg:col-span-2" icon={Activity}>
                    <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="timestamp" 
                            tickFormatter={(t) => new Date(t).toLocaleTimeString()}
                            stroke="#94a3b8"
                            fontSize={10}
                          />
                          <YAxis domain={['auto', 'auto']} stroke="#94a3b8" fontSize={12} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                            labelFormatter={(label) => new Date(label).toLocaleString()}
                          />
                          <Legend verticalAlign="top" height={36}/>
                          <Area 
                            type="monotone" 
                            dataKey={selectedAnomaly.type.toLowerCase() === 'voltage' ? 'voltage' : 'current'} 
                            stroke="#f43f5e" 
                            fillOpacity={0.1} 
                            fill="#f43f5e" 
                            strokeWidth={3} 
                            name={`異常指標: ${selectedAnomaly.type}`} 
                          />
                          {/* Reference line for threshold */}
                          <defs>
                            <linearGradient id="anomalyGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Floating Alert Popup */}
        <AnimatePresence>
          {showAlert && (
            <motion.div 
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              className="fixed bottom-8 right-8 z-50 w-80 bg-white border-2 border-rose-500 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="bg-rose-500 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  <AlertTriangle size={18} />
                  <span className="font-bold text-sm tracking-tight">系統異常警報</span>
                </div>
                <button onClick={() => setShowAlert(null)} className="text-white/80 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-rose-600 uppercase tracking-widest">{showAlert.type} 異常</span>
                  <span className="text-[10px] text-slate-400">{new Date(showAlert.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="text-sm font-medium text-slate-700 leading-relaxed">
                  {showAlert.message}
                </p>
                <div className="pt-2 flex justify-end">
                  <button 
                    onClick={() => { 
                      setSelectedAnomaly(showAlert);
                      setShowAlert(null); 
                      setActiveTab('diagnostics'); 
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    查看詳情 <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}} />
    </div>
  );
}
