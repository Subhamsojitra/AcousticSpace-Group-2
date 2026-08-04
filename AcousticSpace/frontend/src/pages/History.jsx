import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { getHistory } from '../services/api';
import { formatConfidence } from '../services/apiHelpers';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  FolderOpen, 
  Calendar, 
  TrendingUp, 
  Info, 
  Database,
  ArrowRight,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function History() {
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Controls
  const [search, setSearch] = useState('');
  const [verdictFilter, setVerdictFilter] = useState('all'); // 'all' | 'real' | 'fake'
  const [sortField, setSortField] = useState('date'); // 'date' | 'confidence' | 'name'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'
  const [selectedRecord, setSelectedRecord] = useState(null);

  const { addToast } = useToast();

  const handleSelectRecord = useCallback((record) => {
    setSelectedRecord(record);
  }, []);

  const handleCloseInspect = useCallback(() => {
    setSelectedRecord(null);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    getHistory()
      .then(data => {
        if (active) {
          setHistoryList(data?.history || []);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to load logs history:', err);
        if (active) {
          setError('Analysis history endpoint unreachable.');
          setLoading(false);
          addToast('Database endpoint connection failed', 'error');
        }
      });

    return () => {
      active = false;
    };
  }, [addToast]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Filter and Sort logs
  const filteredList = useMemo(() => {
    return historyList
      .filter(record => {
        const matchSearch = (record.filename || record.file_name || 'unknown.wav').toLowerCase().includes(search.toLowerCase());
        const recordPrediction = (record.prediction || '').trim().toLowerCase();
        const matchFilter = verdictFilter === 'all' || recordPrediction === verdictFilter;
        return matchSearch && matchFilter;
      })
      .sort((a, b) => {
        let aVal = a[sortField] || '';
        let bVal = b[sortField] || '';

        if (sortField === 'date') {
          aVal = a.timestamp || a.created_at || '';
          bVal = b.timestamp || b.created_at || '';
        } else if (sortField === 'confidence') {
          aVal = Number(a.confidence) || 0;
          bVal = Number(b.confidence) || 0;
        } else if (sortField === 'name') {
          aVal = (a.filename || a.file_name || '').toLowerCase();
          bVal = (b.filename || b.file_name || '').toLowerCase();
        }

        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [historyList, search, verdictFilter, sortField, sortOrder]);

  return (
    <div className="space-y-8 animate-fadeIn relative pb-4">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">
          Analysis Records Vault
        </h1>
        <p className="text-xs text-text-secondary mt-2 font-normal tracking-wide leading-relaxed">
          Historical registry of compiled acoustic integrity analyses, speech validation logs, and prediction reports.
        </p>
      </div>

      {/* Main Grid split: Table (Left), Details Expansion Drawer (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Column: Data Grid and Controls */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row gap-4 p-4 bg-cyber-dark backdrop-blur-xl border border-cyber-border rounded-2xl shadow-sm">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" size={14} />
              <input
                type="text"
                placeholder="Search database filename..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-cyber-border/40 hover:border-cyber-border/80 focus:border-cyber-cyan/50 focus-visible:ring-2 focus-visible:ring-cyber-cyan/50 text-xs text-text-primary pl-9 pr-4 py-2 rounded-xl focus-visible:outline-none transition-all font-mono"
              />
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2">
              <Filter className="text-text-secondary" size={13} />
              <select
                value={verdictFilter}
                onChange={(e) => setVerdictFilter(e.target.value)}
                className="bg-white/5 border border-cyber-border/40 hover:border-cyber-border/80 focus:border-cyber-cyan/50 focus-visible:ring-2 focus-visible:ring-cyber-cyan/50 text-xs text-text-primary px-3 py-2 rounded-xl focus-visible:outline-none cursor-pointer transition-all font-mono"
              >
                <option value="all" className="bg-cyber-black text-text-primary">All Verdicts</option>
                <option value="real" className="bg-cyber-black text-text-primary">Authentic (Real)</option>
                <option value="fake" className="bg-cyber-black text-text-primary">Suspicious (Fake)</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-cyber-dark backdrop-blur-xl border border-cyber-border rounded-2xl shadow-md overflow-hidden transition-all duration-300">
            {loading ? (
              /* Loading Skeleton Grid */
              <div className="p-8 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 w-full bg-white/[0.01] border border-cyber-border rounded-xl animate-pulse"></div>
                ))}
              </div>
            ) : error ? (
              /* Offline database empty state */
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                <Database size={24} className="text-cyber-rose animate-pulse" />
                <div>
                  <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono">
                    Gateway Database Unreachable
                  </h3>
                  <p className="text-[10px] text-text-secondary font-normal mt-1 max-w-sm leading-normal font-mono">
                    {error} Check if your backend server is online and running.
                  </p>
                </div>
              </div>
            ) : filteredList.length === 0 ? (
              /* Empty Database placeholder */
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                <FolderOpen size={24} className="text-text-secondary" />
                <div>
                  <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono">
                    No Logs Registry Found
                  </h3>
                  <p className="text-[10px] text-text-secondary font-normal mt-1 max-w-sm leading-normal font-mono">
                    Acoustic classifications are recorded locally. Begin a secure console scan on the dashboard to register items.
                  </p>
                </div>
              </div>
            ) : (
              /* Data Table */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-cyber-border/40 text-text-secondary text-[9px] uppercase tracking-wider bg-white/[0.01]">
                      <th className="p-4 cursor-pointer hover:text-text-primary transition-colors select-none" onClick={() => handleSort('name')}>
                        <div className="flex items-center gap-1.5">
                          Filename <ArrowUpDown size={10} />
                        </div>
                      </th>
                      <th className="p-4 cursor-pointer hover:text-text-primary transition-colors select-none" onClick={() => handleSort('date')}>
                        <div className="flex items-center gap-1.5">
                          Scan Date <ArrowUpDown size={10} />
                        </div>
                      </th>
                      <th className="p-4">Verdict</th>
                      <th className="p-4 cursor-pointer hover:text-text-primary transition-colors select-none" onClick={() => handleSort('confidence')}>
                        <div className="flex items-center gap-1.5">
                          Confidence <ArrowUpDown size={10} />
                        </div>
                      </th>
                      <th className="p-4 text-center">Inspect</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredList.map((record, index) => (
                      <HistoryRow
                        key={record.id || index}
                        record={record}
                        isSelected={selectedRecord?.id === record.id}
                        onSelect={handleSelectRecord}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        {/* Right Column: Record Detail View Panel */}
        <div className="xl:col-span-1">
          {selectedRecord ? (
            <RecordDetailPanel 
              record={selectedRecord} 
              onClose={handleCloseInspect} 
            />
          ) : (
            <div className="bg-cyber-dark backdrop-blur-xl border border-cyber-border rounded-2xl p-6 flex flex-col items-center justify-center text-center py-12">
              <Info size={20} className="text-text-secondary animate-pulse" />
              <p className="text-[10px] font-mono text-text-secondary uppercase tracking-wider mt-3 font-semibold">
                Inspector Standby
              </p>
              <p className="text-[9px] text-text-secondary mt-1 font-mono leading-normal max-w-[200px]">
                Click on any database file row to inspect full parameters.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const HistoryRow = React.memo(({ record, isSelected, onSelect }) => {
  const isReal = (record.prediction || '').trim().toLowerCase() === 'real';
  const rowDate = record.timestamp || record.created_at || '—';
  const rowName = record.filename || record.file_name || 'unknown_payload.wav';
  const rowConfidence = (record.confidence !== null && record.confidence !== undefined && record.confidence !== '' && !isNaN(Number(record.confidence)))
    ? formatConfidence(record.confidence)
    : 'Unavailable';

  return (
    <tr
      onClick={() => onSelect(record)}
      className={`border-b border-cyber-border/20 transition-all cursor-pointer hover:bg-white/[0.01] ${
        isSelected ? 'bg-white/5 font-semibold border-l-2 border-l-cyber-cyan' : ''
      }`}
    >
      <td className="p-4 font-semibold text-text-primary max-w-[200px] truncate" title={rowName}>
        {rowName}
      </td>
      <td className="p-4 text-text-secondary text-[11px]">{rowDate}</td>
      <td className="p-4">
        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
          isReal 
            ? 'bg-cyber-green/5 border border-cyber-green/20 text-cyber-green' 
            : 'bg-cyber-rose/5 border border-cyber-rose/20 text-cyber-rose'
        }`}>
          {isReal ? 'REAL' : 'FAKE'}
        </span>
      </td>
      <td className="p-4 text-text-primary font-bold text-[11px]">
        {rowConfidence}
      </td>
      <td className="p-4 text-center">
        <button 
          className="p-1.5 hover:bg-white/10 rounded transition-all text-text-secondary hover:text-text-primary active:scale-90 focus-visible:ring-2 focus-visible:ring-cyber-cyan/50 focus-visible:outline-none"
          aria-label={`Inspect details for ${rowName}`}
        >
          <ArrowRight size={12} />
        </button>
      </td>
    </tr>
  );
});

HistoryRow.displayName = 'HistoryRow';

const RecordDetailPanel = React.memo(({ record, onClose }) => {
  const isReal = (record.prediction || '').trim().toLowerCase() === 'real';

  return (
    <div className="bg-cyber-dark backdrop-blur-xl border border-cyber-border rounded-2xl p-6 shadow-md space-y-6 animate-fadeIn">
      <div className="flex justify-between items-start gap-4 pb-4 border-b border-cyber-border/40">
        <div className="min-w-0">
          <span className="text-[9px] font-mono text-text-secondary uppercase tracking-wider">
            SPECIFICATION INSPECT
          </span>
          <h2 className="text-sm font-semibold tracking-tight text-text-primary truncate mt-1" title={record.filename || record.file_name}>
            {record.filename || record.file_name || 'unknown_payload.wav'}
          </h2>
        </div>
        <div className={`p-2 rounded-lg border shrink-0 ${
          isReal
            ? 'bg-white/5 border-cyber-green/20 text-cyber-green'
            : 'bg-white/5 border-cyber-rose/20 text-cyber-rose'
        }`}>
          {isReal ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
        </div>
      </div>

      <div className="space-y-4 font-mono text-[11px]">
        <div className="p-3.5 bg-white/[0.01] border border-cyber-border/40 rounded-xl space-y-2">
          <span className="text-[8px] text-text-secondary uppercase tracking-wider block font-bold">Security Verdict</span>
          <p className="text-text-secondary leading-relaxed">
            Classified as <strong className={isReal ? 'text-cyber-green' : 'text-cyber-rose'}>
              {(record.prediction || 'Unknown').toUpperCase()}
            </strong> with statistical probability score of <strong className="text-text-primary">{formatConfidence(record.confidence)}</strong>.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-white/[0.01] border border-cyber-border/40 rounded-xl space-y-1">
            <span className="text-[8px] text-text-secondary uppercase tracking-wider block">Duration</span>
            <span className="text-xs text-text-primary font-bold">{(record.duration !== null && record.duration !== undefined) ? `${Number(record.duration).toFixed(2)}s` : '—'}</span>
          </div>
          <div className="p-3 bg-white/[0.01] border border-cyber-border/40 rounded-xl space-y-1">
            <span className="text-[8px] text-text-secondary uppercase tracking-wider block">Sample Rate</span>
            <span className="text-xs text-text-primary font-bold">{record.sample_rate ? `${record.sample_rate} Hz` : '—'}</span>
          </div>
        </div>

        <div className="p-3 bg-white/[0.01] border border-cyber-border/40 rounded-xl space-y-2">
          <span className="text-[8px] text-text-secondary uppercase tracking-wider block">Scan Timestamp</span>
          <div className="flex items-center gap-2 text-text-primary font-semibold">
            <Calendar size={12} className="text-text-secondary" />
            <span>{record.timestamp || record.created_at || '—'}</span>
          </div>
        </div>

        {record.processing_time && (
          <div className="p-3 bg-white/[0.01] border border-cyber-border/40 rounded-xl space-y-2">
            <span className="text-[8px] text-text-secondary uppercase tracking-wider block">Inference Process Time</span>
            <div className="flex items-center gap-2 text-text-primary font-semibold">
              <TrendingUp size={12} className="text-text-secondary" />
              <span>{record.processing_time}s</span>
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-cyber-border/40 text-center">
        <button 
          onClick={onClose}
          className="px-4 py-2 text-[10px] font-semibold text-text-secondary hover:text-text-primary border border-cyber-border/60 hover:border-cyber-border rounded-xl cursor-pointer transition-all active:scale-95 btn-active-scale focus-visible:ring-2 focus-visible:ring-cyber-cyan/50 focus-visible:outline-none"
          aria-label="Close details inspect panel"
        >
          Close Inspect Panel
        </button>
      </div>
    </div>
  );
});

RecordDetailPanel.displayName = 'RecordDetailPanel';
