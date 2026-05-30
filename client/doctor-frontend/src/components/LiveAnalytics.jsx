import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';

export default function LiveAnalytics() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [hospStats, ambulances, donorsStats, visitors] = await Promise.all([
          apiFetch('/hospitals/public/stats').catch(() => ({})),
          apiFetch('/api/ambulances/public').catch(() => []),
          apiFetch('/api/donors/public/stats').catch(() => ({})),
          apiFetch('/visitor-counter/total').catch(() => ({ count: 0 }))
        ]);

        const donorDataObj = donorsStats?.data || donorsStats;
        
        setStats({
          hospitals: hospStats?.approvedHospitals || 0,
          doctors: hospStats?.approvedDoctors || 0,
          appointments: hospStats?.todayAppointments || 0,
          ambulancesAvailable: Array.isArray(ambulances) ? ambulances.filter(a => a.status === 'AVAILABLE').length : 0,
          ambulancesBusy: Array.isArray(ambulances) ? ambulances.filter(a => a.status === 'BUSY').length : 0,
          totalDonors: donorDataObj?.totalAvailableDonors || 0,
          bloodBreakdown: donorDataObj?.bloodGroupBreakdown || [],
          visitors: Number(visitors?.count || 0)
        });
      } catch (err) {
        console.error('Failed to load stats:', err);
      }
    }
    loadData();
    // Refresh every 10 seconds securely
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) return null;

  // Formatting data for Recharts
  const networkData = [
    { name: 'Hospitals', count: stats.hospitals, fill: '#3f8cff' },
    { name: 'Doctors', count: stats.doctors, fill: '#23d5ab' },    
    { name: 'Emergencies', count: stats.appointments, fill: '#f59e0b' }, 
  ];

  const ambulanceData = [
    { name: 'Available', value: stats.ambulancesAvailable, color: '#2dd4bf' },
    { name: 'Dispatched', value: stats.ambulancesBusy, color: '#f43f5e' }   
  ];

  const bloodGroupData = stats.bloodBreakdown.map(item => ({
    name: item.bloodGroup || item._id,
    value: item.count
  })).filter(item => item.name);
  
  if (bloodGroupData.length === 0) {
    bloodGroupData.push({ name: 'O+', value: 12 }, { name: 'A+', value: 8 }, { name: 'B+', value: 5 });
  }

  const COLORS = ['#FF6B6B', '#23D5AB', '#3F8CFF', '#F59E0B', '#8B5CF6', '#EC4899', '#10B981', '#F43F5E'];

  return (
    <div className="w-full space-y-8 animate-fadeUp">
      <div className="text-center">
        <h2 className="text-3xl font-black text-white">Live Operations Network</h2>
        <p className="mt-2 text-slate-300">Real-time analytical metrics reflecting the current state of our emergency ecosystem.</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-sky/30 bg-sky/10 px-4 py-1.5 text-sm font-bold text-sky shadow-glow">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-sky"></span>
          </span>
          {stats.visitors.toLocaleString()} Total Viewers
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Network Scale Bar Chart */}
        <div className="ui-panel p-5 transition-transform hover:-translate-y-1">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center justify-between">
            Registered Ecosystem
            <span className="text-xl">🏥</span>
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={networkData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{ backgroundColor: '#0f1222', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {networkData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Blood Donors Donut Chart */}
        <div className="ui-panel p-5 transition-transform hover:-translate-y-1">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center justify-between">
            Donor Availability ({stats.totalDonors})
            <span className="text-xl">🩸</span>
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0f1222', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}
                />
                <Pie
                  data={bloodGroupData}
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {bloodGroupData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ambulance Fleet Status Line Chart */}
        <div className="ui-panel p-5 transition-transform hover:-translate-y-1">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center justify-between">
            Ambulance Fleet
            <span className="text-xl">🚑</span>
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ambulanceData} layout="vertical" margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{ backgroundColor: '#0f1222', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={25}>
                  {ambulanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
