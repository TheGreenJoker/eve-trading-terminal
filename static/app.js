const { useState, useEffect } = React;

function App() {
    const [currentTab, setCurrentTab] = useState('dashboard');
    const [opportunities, setOpportunities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);
    const [itemDetail, setItemDetail] = useState(null);
    
    // Simulator State
    const [simCapital, setSimCapital] = useState(500000000);
    const [simResults, setSimResults] = useState([]);
    const [simLoading, setSimLoading] = useState(false);

    useEffect(() => {
        fetchOpportunities();
    }, []);

    const fetchOpportunities = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/opportunities');
            const data = await res.json();
            setOpportunities(data);
        } catch (e) {
            console.error("Error loading opportunities", e);
        }
        setLoading(false);
    };

    const loadItemDetail = async (type_id) => {
        setSelectedItem(type_id);
        setCurrentTab('detail');
        try {
            const res = await fetch(`/api/item/${type_id}`);
            const data = await res.json();
            setItemDetail(data);
        } catch (e) {
            console.error("Error loading detail", e);
        }
    };

    const runSimulation = async () => {
        setSimLoading(true);
        try {
            const res = await fetch('/api/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ capital: simCapital })
            });
            const data = await res.json();
            setSimResults(data);
        } catch (e) {
            console.error("Simulation error", e);
        }
        setSimLoading(false);
    };

    const formatISK = (val) => {
        if (!val) return '0 ISK';
        if (val >= 1e9) return (val / 1e9).toFixed(2) + ' B ISK';
        if (val >= 1e6) return (val / 1e6).toFixed(2) + ' M ISK';
        if (val >= 1e3) return (val / 1e3).toFixed(2) + ' K ISK';
        return val.toFixed(2) + ' ISK';
    };

    const getScoreBadge = (score) => {
        if (score >= 75) return <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold">🟢 EXCELLENT ({score})</span>;
        if (score >= 50) return <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold">🟡 MOYEN ({score})</span>;
        return <span className="px-2 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 text-xs font-bold">🔴 RISQUÉ ({score})</span>;
    };

    return (
        <div className="flex h-screen overflow-hidden bg-eve-bg text-slate-200">
            {/* Sidebar */}
            <aside className="w-64 bg-eve-card border-r border-eve-border flex flex-col justify-between p-4">
                <div>
                    <div className="flex items-center space-x-3 mb-8">
                        <div className="w-8 h-8 rounded-lg bg-eve-accent/20 border border-eve-accent flex items-center justify-center font-bold text-eve-accent">
                            ⚡
                        </div>
                        <h1 className="font-extrabold text-lg tracking-wider text-slate-100">EVE CORE <span className="text-xs text-eve-accent block font-mono">TRADING TERMINAL</span></h1>
                    </div>

                    <nav className="space-y-1">
                        {[
                            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
                            { id: 'scanner', label: 'Market Scanner', icon: '🔍' },
                            { id: 'simulator', label: 'Position Simulator', icon: '🧮' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setCurrentTab(tab.id)}
                                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                                    currentTab === tab.id 
                                        ? 'bg-eve-accent/10 border border-eve-accent/40 text-eve-accent' 
                                        : 'hover:bg-eve-border/50 text-slate-400'
                                }`}
                            >
                                <span>{tab.icon}</span>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="border-t border-eve-border pt-4 text-xs text-slate-500 space-y-1">
                    <div>Région: <span className="text-slate-300 font-bold">The Forge (Jita)</span></div>
                    <div>ESI API: <span className="text-emerald-400 font-bold">Online</span></div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-8">
                {/* Header Top Bar */}
                <header className="flex justify-between items-center mb-8 border-b border-eve-border pb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-100">
                            {currentTab === 'dashboard' && 'Market Dashboard'}
                            {currentTab === 'scanner' && 'Scanner de Marché Spatiale'}
                            {currentTab === 'simulator' && 'Simulateur de Capital ("What should I trade?")'}
                            {currentTab === 'detail' && 'Analyse Détaillée Item'}
                        </h2>
                        <p className="text-xs text-slate-400">Analyse de liquidité et spreads temps réel</p>
                    </div>
                    <button 
                        onClick={fetchOpportunities}
                        className="px-4 py-2 bg-eve-accent/20 border border-eve-accent text-eve-accent rounded-lg text-sm font-semibold hover:bg-eve-accent/30 transition"
                    >
                        🔄 Rafraîchir ESI
                    </button>
                </header>

                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 space-y-4">
                        <div className="w-12 h-12 border-4 border-eve-accent border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm font-mono text-eve-accent">Calcul du Liquidity Score ESI en cours...</p>
                    </div>
                ) : (
                    <>
                        {/* TAB: DASHBOARD */}
                        {currentTab === 'dashboard' && (
                            <div className="space-y-6">
                                {/* Top Stats */}
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="p-4 bg-eve-card border border-eve-border rounded-xl">
                                        <div className="text-xs text-slate-400 uppercase tracking-wider">Opportunités Détectées</div>
                                        <div className="text-2xl font-extrabold text-eve-accent mt-1">{opportunities.length}</div>
                                    </div>
                                    <div className="p-4 bg-eve-card border border-eve-border rounded-xl">
                                        <div className="text-xs text-slate-400 uppercase tracking-wider">Meilleur ROI Estimé</div>
                                        <div className="text-2xl font-extrabold text-emerald-400 mt-1">
                                            {opportunities.length > 0 ? opportunities[0].roi_pct + '%' : '0%'}
                                        </div>
                                    </div>
                                    <div className="p-4 bg-eve-card border border-eve-border rounded-xl">
                                        <div className="text-xs text-slate-400 uppercase tracking-wider">Liquinité Moyenne</div>
                                        <div className="text-2xl font-extrabold text-amber-400 mt-1">
                                            {opportunities.length > 0 ? Math.round(opportunities.reduce((a,b)=>a+b.liquidity_score,0)/opportunities.length) + '/100' : '0'}
                                        </div>
                                    </div>
                                    <div className="p-4 bg-eve-card border border-eve-border rounded-xl">
                                        <div className="text-xs text-slate-400 uppercase tracking-wider">Top Recommandation</div>
                                        <div className="text-lg font-bold text-slate-100 mt-1 truncate">
                                            {opportunities.length > 0 ? opportunities[0].name : 'N/A'}
                                        </div>
                                    </div>
                                </div>

                                {/* Top Opportunities Grid */}
                                <h3 className="text-lg font-bold text-slate-200">🔥 Top Opportunities Right Now</h3>
                                <div className="grid grid-cols-3 gap-6">
                                    {opportunities.slice(0, 6).map(op => (
                                        <div 
                                            key={op.type_id} 
                                            onClick={() => loadItemDetail(op.type_id)}
                                            className="p-5 bg-eve-card border border-eve-border hover:border-eve-accent/50 rounded-xl cursor-pointer transition-all space-y-3"
                                        >
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-slate-100">{op.name}</h4>
                                                {getScoreBadge(op.opportunity_score)}
                                            </div>

                                            {/* COLLES LE CODE ICI : */}
                                            {op.is_banger && (
                                                <div className="bg-gradient-to-r from-amber-500 to-rose-500 text-black font-extrabold text-[10px] uppercase px-2 py-0.5 rounded tracking-widest animate-pulse flex items-center space-x-1 mt-1">
                                                    <span>🔥 BANGER SETUP</span>
                                                    <span className="text-[9px] opacity-80">(Buy 📉 / Sell 📈)</span>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div>
                                                    <span className="text-slate-400 block">Buy Price</span>
                                                    <span className="font-mono text-slate-200">{formatISK(op.best_buy)}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400 block">Sell Price</span>
                                                    <span className="font-mono text-slate-200">{formatISK(op.best_sell)}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400 block">Net Profit / Unit</span>
                                                    <span className="font-mono text-emerald-400 font-bold">+{formatISK(op.net_profit_per_unit)}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400 block">ROI</span>
                                                    <span className="font-mono text-emerald-400 font-bold">{op.roi_pct}%</span>
                                                </div>
                                            </div>

                                            <div className="border-t border-eve-border pt-2 text-xs space-y-1">
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">Liquidity Score:</span>
                                                    <span className="font-bold text-eve-accent">{op.liquidity_score}/100</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">Exit Estimé (100M ISK):</span>
                                                    <span className="font-bold text-slate-200">{op.est_liquidation_days} jours</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* TAB: SCANNER */}
                        {currentTab === 'scanner' && (
                            <div className="bg-eve-card border border-eve-border rounded-xl overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-eve-bg border-b border-eve-border text-slate-400 font-mono text-xs uppercase">
                                        <tr>
                                            <th className="p-4">Item</th>
                                            <th className="p-4">Buy Price</th>
                                            <th className="p-4">Sell Price</th>
                                            <th className="p-4">Spread %</th>
                                            <th className="p-4">ROI %</th>
                                            <th className="p-4">Vol/Jour</th>
                                            <th className="p-4">Liquidity</th>
                                            <th className="p-4">Score</th>
                                            <th className="p-4 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-eve-border">
                                        {opportunities.map(op => (
                                            <tr key={op.type_id} className="hover:bg-eve-border/30 transition">
                                                <td className="p-4 font-bold text-slate-100">{op.name}</td>
                                                <td className="p-4 font-mono">{formatISK(op.best_buy)}</td>
                                                <td className="p-4 font-mono">{formatISK(op.best_sell)}</td>
                                                <td className="p-4 font-mono text-amber-400">{op.spread_pct}%</td>
                                                <td className="p-4 font-mono text-emerald-400 font-bold">{op.roi_pct}%</td>
                                                <td className="p-4 font-mono">{op.daily_volume.toLocaleString()}</td>
                                                <td className="p-4 font-bold text-eve-accent">{op.liquidity_score}/100</td>
                                                <td className="p-4">{getScoreBadge(op.opportunity_score)}</td>
                                                <td className="p-4 text-right">
                                                    <button 
                                                        onClick={() => loadItemDetail(op.type_id)}
                                                        className="px-3 py-1 bg-eve-border hover:bg-eve-accent/20 hover:text-eve-accent rounded text-xs transition"
                                                    >
                                                        Analyser
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* TAB: SIMULATOR */}
                        {currentTab === 'simulator' && (
                            <div className="space-y-6">
                                <div className="p-6 bg-eve-card border border-eve-border rounded-xl space-y-4">
                                    <h3 className="text-lg font-bold text-slate-100">Définir votre Capital d'Investissement</h3>
                                    <div className="flex space-x-4">
                                        <input 
                                            type="number" 
                                            value={simCapital} 
                                            onChange={(e) => setSimCapital(Number(e.target.value))}
                                            className="flex-1 bg-eve-bg border border-eve-border rounded-lg px-4 py-2 font-mono text-slate-100 focus:outline-none focus:border-eve-accent"
                                            placeholder="Capital en ISK (ex: 500000000)"
                                        />
                                        <button 
                                            onClick={runSimulation}
                                            className="px-6 py-2 bg-eve-accent text-eve-bg font-bold rounded-lg hover:bg-cyan-300 transition"
                                        >
                                            {simLoading ? 'Calcul...' : 'Recommander Trades'}
                                        </button>
                                    </div>
                                </div>

                                {simResults.length > 0 && (
                                    <div className="space-y-4">
                                        <h4 className="font-bold text-slate-200">Allocation Recommandée :</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            {simResults.map(res => (
                                                <div key={res.type_id} className="p-5 bg-eve-card border border-eve-border rounded-xl space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <h5 className="font-bold text-eve-accent">{res.name}</h5>
                                                        <span className="text-xs font-mono bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded">ROI {res.roi_pct}%</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                        <div>Acheter Quantité: <span className="font-mono font-bold text-slate-100">{res.units.toLocaleString()}</span></div>
                                                        <div>Coût Total: <span className="font-mono text-slate-200">{formatISK(res.total_cost)}</span></div>
                                                        <div>Profit Estimé: <span className="font-mono text-emerald-400 font-bold">{formatISK(res.est_profit)}</span></div>
                                                        <div>Temps d'Exit: <span className="font-mono text-slate-200">{res.est_days} jours</span></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB: ITEM DETAIL */}
                        {currentTab === 'detail' && itemDetail && (
                            <div className="space-y-6">
                                <div className="p-6 bg-eve-card border border-eve-border rounded-xl flex justify-between items-center">
                                    <div>
                                        <h3 className="text-2xl font-extrabold text-slate-100">{itemDetail.name}</h3>
                                        <div className="text-xs text-slate-400 mt-1">Type ID: {itemDetail.type_id} | Station: Jita IV - Moon 4</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-slate-400">Opportunity Score</div>
                                        <div className="text-3xl font-extrabold text-eve-accent">{itemDetail.metrics.opportunity_score}/100</div>
                                    </div>
                                </div>

                                {/* Order Book Deep Dive */}
                                <div className="grid grid-cols-2 gap-6">
                                    {/* Buy Orders */}
                                    <div className="p-5 bg-eve-card border border-eve-border rounded-xl">
                                        <h4 className="font-bold text-emerald-400 mb-4 flex justify-between">
                                            <span>BUY ORDERS (Acheteurs)</span>
                                            <span className="text-xs text-slate-400 font-normal">Max: {formatISK(itemDetail.metrics.best_buy)}</span>
                                        </h4>
                                        <div className="space-y-2 font-mono text-xs">
                                            {itemDetail.buy_orders.map((o, idx) => (
                                                <div key={idx} className="flex justify-between border-b border-eve-border/40 pb-1">
                                                    <span className="text-slate-300">{formatISK(o.price)}</span>
                                                    <span className="text-slate-400">{o.volume_remain.toLocaleString()} units</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Sell Orders */}
                                    <div className="p-5 bg-eve-card border border-eve-border rounded-xl">
                                        <h4 className="font-bold text-rose-400 mb-4 flex justify-between">
                                            <span>SELL ORDERS (Vendeurs)</span>
                                            <span className="text-xs text-slate-400 font-normal">Min: {formatISK(itemDetail.metrics.best_sell)}</span>
                                        </h4>
                                        <div className="space-y-2 font-mono text-xs">
                                            {itemDetail.sell_orders.map((o, idx) => (
                                                <div key={idx} className="flex justify-between border-b border-eve-border/40 pb-1">
                                                    <span className="text-slate-300">{formatISK(o.price)}</span>
                                                    <span className="text-slate-400">{o.volume_remain.toLocaleString()} units</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
