
import React, { useState, useEffect } from 'react';
import { ModuleContent, Scene3D, SimulationState } from '../types';

const SceneRenderer: React.FC<{ scene: Scene3D }> = ({ scene }) => {
    const initialState: SimulationState = {};
    scene.controls.forEach(c => initialState[c.id] = c.defaultValue);
    const [state, setState] = useState(initialState);

    const handleControlChange = (id: string, value: any) => {
        setState(prev => ({ ...prev, [id]: value }));
    };

    return (
        <div className="my-8 border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
            <div className="bg-slate-800 text-white p-4 border-b border-slate-700">
                <h3 className="font-bold text-lg flex items-center">
                    <span className="bg-indigo-500 text-xs px-2 py-1 rounded mr-3 uppercase tracking-wider font-bold">Interactive</span>
                    {scene.title}
                </h3>
            </div>
            
            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-slate-900 rounded-lg flex items-center justify-center p-1 min-h-[400px] relative shadow-inner">
                    {scene.renderLogic(state)}
                </div>

                <div className="space-y-6 flex flex-col justify-between">
                    <div className="space-y-4">
                        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg text-sm text-indigo-900">
                            <strong className="block text-indigo-700 uppercase text-xs mb-1">Learning Outcome</strong>
                            {scene.learningOutcome}
                        </div>
                        <p className="text-sm text-slate-600 italic">{scene.description}</p>
                    </div>
                    
                    <div className="space-y-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        {scene.controls.map(ctrl => (
                            <div key={ctrl.id} className="flex flex-col">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-bold text-slate-700 uppercase">{ctrl.label}</label>
                                    {ctrl.type === 'slider' && <span className="text-xs font-mono bg-slate-200 px-2 py-0.5 rounded">{state[ctrl.id]}</span>}
                                </div>
                                {ctrl.type === 'slider' && (
                                    <input 
                                        type="range" 
                                        min={ctrl.min} 
                                        max={ctrl.max} 
                                        step={ctrl.step || 1}
                                        value={state[ctrl.id] as number}
                                        onChange={(e) => handleControlChange(ctrl.id, parseFloat(e.target.value))}
                                        className="w-full accent-indigo-600 h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer"
                                    />
                                )}
                                {ctrl.type === 'select' && (
                                    <div className="relative">
                                        <select 
                                            value={state[ctrl.id] as string}
                                            onChange={(e) => handleControlChange(ctrl.id, e.target.value)}
                                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                                        >
                                            {ctrl.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700">
                                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ModuleView: React.FC<{ module: ModuleContent }> = ({ module }) => {
    const [activeTab, setActiveTab] = useState<'study' | 'detailed' | 'quiz'>('study');
    const [quizState, setQuizState] = useState<{ [key: number]: number | null }>({});
    const [showQuizAns, setShowQuizAns] = useState<{ [key: number]: boolean }>({});

    useEffect(() => {
        window.scrollTo(0,0);
        setActiveTab('study');
        setQuizState({});
        setShowQuizAns({});
    }, [module.id]);

    return (
        <div className="max-w-5xl mx-auto pb-20">
            <header className="mb-8 border-b border-slate-200 pb-6">
                <h1 className="text-3xl font-bold text-slate-900">{module.title}</h1>
                <div className="flex flex-wrap gap-2 mt-6">
                    <button 
                        onClick={() => setActiveTab('study')}
                        className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'study' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'}`}
                    >
                        High-Yield & Sims
                    </button>
                    <button 
                        onClick={() => setActiveTab('detailed')}
                        className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'detailed' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'}`}
                    >
                        Detailed Text (Harrison's)
                    </button>
                    <button 
                        onClick={() => setActiveTab('quiz')}
                        className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'quiz' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'}`}
                    >
                        Clinical Quiz
                    </button>
                </div>
            </header>

            {activeTab === 'study' && (
                <div className="space-y-12 animate-fadeIn">
                    <section className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
                        <h2 className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-4 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/></svg>
                            Key Concepts
                        </h2>
                        <ul className="grid md:grid-cols-2 gap-3">
                            {module.overview.map((pt, i) => (
                                <li key={i} className="flex items-start gap-3 text-slate-800 text-sm font-medium">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></span>
                                    {pt}
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* Concept Explainer */}
                    <section className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-700 prose-li:text-slate-700 prose-strong:text-slate-900">
                        <div dangerouslySetInnerHTML={{ __html: module.explainer }} />
                    </section>

                    {/* Simulations */}
                    {module.scenes.map(scene => (
                        <SceneRenderer key={scene.id} scene={scene} />
                    ))}

                    {/* Mnemonics */}
                    {module.mnemonics.length > 0 && (
                        <section className="grid sm:grid-cols-2 gap-4">
                            {module.mnemonics.map((m, i) => (
                                <div key={i} className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg shadow-sm">
                                    <div className="text-xs font-bold text-yellow-600 uppercase mb-1">Memory Hook</div>
                                    <div className="font-bold text-slate-900 text-lg mb-1">{m.hook}</div>
                                    <div className="text-slate-700 text-sm">{m.explanation}</div>
                                </div>
                            ))}
                        </section>
                    )}

                    {/* Tables */}
                    {module.tables.map((t, i) => (
                        <div key={i} className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 font-bold text-slate-700">{t.title}</div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-white text-slate-500 font-semibold border-b border-slate-100">
                                        <tr>
                                            {t.content[0].map((h, idx) => <th key={idx} className="px-6 py-3">{h}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {t.content.slice(1).map((row, rIdx) => (
                                            <tr key={rIdx} className="hover:bg-slate-50">
                                                {row.map((cell, cIdx) => (
                                                    <td key={cIdx} className="px-6 py-4 text-slate-700">{cell}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'detailed' && (
                <div className="space-y-8 animate-fadeIn">
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-700 prose-li:text-slate-700 prose-strong:text-indigo-700 prose-strong:font-bold">
                        <div className="mb-6 pb-6 border-b border-slate-100">
                            <h2 className="text-2xl font-bold text-slate-900 m-0">Detailed Study Notes</h2>
                            <p className="text-slate-500 text-sm mt-2">Based on Harrison's Principles of Internal Medicine</p>
                        </div>
                        <div dangerouslySetInnerHTML={{ __html: module.detailedContent }} />
                    </div>
                </div>
            )}

            {activeTab === 'quiz' && (
                <div className="space-y-8 animate-fadeIn max-w-3xl mx-auto">
                    {module.quiz.map((q) => (
                        <div key={q.id} className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
                            <div className="flex gap-4">
                                <span className="bg-slate-100 text-slate-500 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0">{q.id}</span>
                                <h3 className="font-bold text-slate-900 text-lg mb-4">{q.question}</h3>
                            </div>
                            <div className="space-y-2 ml-12">
                                {q.options.map((opt, idx) => {
                                    const isSelected = quizState[q.id] === idx;
                                    const isCorrect = idx === q.correctIndex;
                                    const showResult = showQuizAns[q.id];
                                    
                                    let btnClass = "w-full text-left p-4 rounded-lg border transition-all ";
                                    if (showResult) {
                                        if (isCorrect) btnClass += "bg-green-50 border-green-500 text-green-900 font-bold";
                                        else if (isSelected) btnClass += "bg-red-50 border-red-500 text-red-900 opacity-50";
                                        else btnClass += "border-slate-200 text-slate-400 opacity-50";
                                    } else {
                                        btnClass += isSelected ? "border-indigo-500 bg-indigo-50 text-indigo-900 font-medium shadow-sm ring-1 ring-indigo-500" : "border-slate-200 hover:bg-slate-50 text-slate-700";
                                    }

                                    return (
                                        <button 
                                            key={idx}
                                            disabled={showResult}
                                            onClick={() => setQuizState({...quizState, [q.id]: idx})}
                                            className={btnClass}
                                        >
                                            <span className="mr-2 opacity-50">{String.fromCharCode(65+idx)}.</span>
                                            {opt}
                                        </button>
                                    );
                                })}
                            </div>
                            {!showQuizAns[q.id] && quizState[q.id] !== undefined && (
                                <div className="ml-12 mt-4">
                                    <button 
                                        onClick={() => setShowQuizAns({...showQuizAns, [q.id]: true})}
                                        className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-md"
                                    >
                                        Check Answer
                                    </button>
                                </div>
                            )}
                            {showQuizAns[q.id] && (
                                <div className="ml-12 mt-4 p-4 bg-slate-50 rounded-lg text-slate-700 border border-slate-200">
                                    <div className="font-bold text-slate-900 text-sm uppercase mb-1">Explanation</div>
                                    <div className="text-sm">{q.explanation}</div>
                                </div>
                            )}
                        </div>
                    ))}
                    
                    {module.vignettes.length > 0 && (
                        <>
                            <div className="border-t border-slate-200 my-12 pt-8">
                                <h2 className="text-2xl font-bold text-slate-900 text-center">Clinical Vignettes</h2>
                                <p className="text-center text-slate-500 mb-8">Test your synthesis of the material</p>
                            </div>
                            {module.vignettes.map((v, i) => (
                                <div key={i} className="bg-white p-8 rounded-xl border border-slate-200 shadow-lg relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-bold uppercase">Case {i+1}</span>
                                        <h3 className="font-bold text-slate-900 text-lg">{v.title}</h3>
                                    </div>
                                    <p className="text-slate-700 mb-6 text-lg leading-relaxed border-l-4 border-slate-100 pl-4 italic">
                                        {v.scenario}
                                    </p>
                                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                                        <p className="font-bold text-slate-900 mb-4 text-lg">{v.question}</p>
                                        <details className="group">
                                            <summary className="cursor-pointer bg-white border border-slate-300 px-4 py-2 rounded-lg inline-flex items-center gap-2 hover:bg-slate-50 transition-colors select-none">
                                                <span className="text-sm font-bold text-slate-700">Reveal Diagnosis & Plan</span>
                                                <svg className="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                                            </summary>
                                            <div className="mt-4 pt-4 border-t border-slate-200">
                                                <p className="font-extrabold text-indigo-700 text-xl mb-2">{v.answer}</p>
                                                <p className="text-slate-700 leading-relaxed">{v.explanation}</p>
                                            </div>
                                        </details>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
