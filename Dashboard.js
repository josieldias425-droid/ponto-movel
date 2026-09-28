'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';

const tabs = [
  ['inicio', 'Visão geral'],
  ['colaboradores', 'Colaboradores'],
  ['veiculos', 'Veículos'],
  ['crachas', 'Crachás NFC'],
  ['registros', 'Registros']
];

function fmtDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

export default function Dashboard() {
  const [tab, setTab] = useState('inicio');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [colaboradores, setColaboradores] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [crachas, setCrachas] = useState([]);
  const [terminais, setTerminais] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [showColabForm, setShowColabForm] = useState(false);
  const [showVeiculoForm, setShowVeiculoForm] = useState(false);
  const [showCrachaForm, setShowCrachaForm] = useState(false);
  const [form, setForm] = useState({ nome: '', matricula: '', cargo: '', placa: '', identificacao: '', colaborador_id: '', codigo_nfc: '' });

  async function loadAll() {
    if (!supabase) {
      setError('Configure as variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const results = await Promise.all([
      supabase.from('ponto_colaboradores').select('*').order('nome'),
      supabase.from('ponto_veiculos').select('*').order('placa'),
      supabase.from('ponto_crachas').select('*, ponto_colaboradores(nome, matricula)').order('created_at', { ascending: false }),
      supabase.from('ponto_terminais').select('*').order('nome'),
      supabase.from('ponto_registros').select('*, ponto_colaboradores(nome, matricula), ponto_veiculos(placa), ponto_terminais(nome)').order('data_hora', { ascending: false }).limit(100)
    ]);
    const firstError = results.find(r => r.error)?.error;
    if (firstError) setError(firstError.message);
    setColaboradores(results[0].data || []);
    setVeiculos(results[1].data || []);
    setCrachas(results[2].data || []);
    setTerminais(results[3].data || []);
    setRegistros(results[4].data || []);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  const stats = useMemo(() => ({
    colaboradores: colaboradores.filter(x => x.ativo).length,
    veiculos: veiculos.filter(x => x.ativo).length,
    crachas: crachas.filter(x => x.ativo).length,
    hoje: registros.filter(x => new Date(x.data_hora).toDateString() === new Date().toDateString()).length
  }), [colaboradores, veiculos, crachas, registros]);

  async function addColaborador(e) {
    e.preventDefault();
    const { error: err } = await supabase.from('ponto_colaboradores').insert({ nome: form.nome, matricula: form.matricula || null, cargo: form.cargo || null });
    if (err) return setError(err.message);
    setForm({ ...form, nome: '', matricula: '', cargo: '' });
    setShowColabForm(false); await loadAll();
  }

  async function addVeiculo(e) {
    e.preventDefault();
    const { error: err } = await supabase.from('ponto_veiculos').insert({ placa: form.placa.toUpperCase(), identificacao: form.identificacao || null });
    if (err) return setError(err.message);
    setForm({ ...form, placa: '', identificacao: '' });
    setShowVeiculoForm(false); await loadAll();
  }

  async function addCracha(e) {
    e.preventDefault();
    const { error: err } = await supabase.from('ponto_crachas').insert({ colaborador_id: form.colaborador_id, codigo_nfc: form.codigo_nfc });
    if (err) return setError(err.message);
    setForm({ ...form, colaborador_id: '', codigo_nfc: '' });
    setShowCrachaForm(false); await loadAll();
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><div className="brandMark">PM</div><div><strong>Ponto Móvel</strong><span>Painel administrativo</span></div></div>
        <button className="refresh" onClick={loadAll}>↻ Atualizar</button>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <nav>{tabs.map(([id, label]) => <button key={id} className={tab === id ? 'nav active' : 'nav'} onClick={() => setTab(id)}>{label}</button>)}</nav>
          <div className="sideNote"><b>Protótipo</b><span>Gestão de ponto por terminal móvel.</span></div>
        </aside>

        <section className="content">
          <div className="pageHead"><div><p className="eyebrow">CONTROLE DE PONTO</p><h1>{tabs.find(x => x[0] === tab)?.[1]}</h1></div><div className="status"><i /> Supabase conectado</div></div>
          {error && <div className="alert">{error}</div>}
          {loading ? <div className="loading">Carregando dados...</div> : <>
            {tab === 'inicio' && <>
              <div className="cards"><Stat title="Colaboradores ativos" value={stats.colaboradores}/><Stat title="Veículos ativos" value={stats.veiculos}/><Stat title="Crachás ativos" value={stats.crachas}/><Stat title="Marcações hoje" value={stats.hoje}/></div>
              <Panel title="Últimas marcações"><Records rows={registros.slice(0, 8)} /></Panel>
            </>}
            {tab === 'colaboradores' && <Panel title="Colaboradores" action={<button className="primary" onClick={() => setShowColabForm(true)}>+ Novo colaborador</button>}><Table headers={['Nome','Matrícula','Cargo','Status']} rows={colaboradores.map(x => [x.nome, x.matricula || '-', x.cargo || '-', x.ativo ? 'Ativo' : 'Inativo'])}/></Panel>}
            {tab === 'veiculos' && <Panel title="Veículos" action={<button className="primary" onClick={() => setShowVeiculoForm(true)}>+ Novo veículo</button>}><Table headers={['Placa','Identificação','Status']} rows={veiculos.map(x => [x.placa, x.identificacao || '-', x.ativo ? 'Ativo' : 'Inativo'])}/></Panel>}
            {tab === 'crachas' && <Panel title="Crachás NFC" action={<button className="primary" onClick={() => setShowCrachaForm(true)}>+ Vincular crachá</button>}><Table headers={['Colaborador','Matrícula','Código NFC','Status']} rows={crachas.map(x => [x.ponto_colaboradores?.nome || '-', x.ponto_colaboradores?.matricula || '-', x.codigo_nfc, x.ativo ? 'Ativo' : 'Inativo'])}/></Panel>}
            {tab === 'registros' && <Panel title="Registros de ponto"><Records rows={registros}/></Panel>}
          </>}
        </section>
      </div>

      {showColabForm && <Modal title="Novo colaborador" onClose={() => setShowColabForm(false)}><form onSubmit={addColaborador}><Input label="Nome *" value={form.nome} onChange={v => setForm({...form, nome:v})}/><Input label="Matrícula" value={form.matricula} onChange={v => setForm({...form, matricula:v})}/><Input label="Cargo" value={form.cargo} onChange={v => setForm({...form, cargo:v})}/><button className="primary full">Salvar</button></form></Modal>}
      {showVeiculoForm && <Modal title="Novo veículo" onClose={() => setShowVeiculoForm(false)}><form onSubmit={addVeiculo}><Input label="Placa *" value={form.placa} onChange={v => setForm({...form, placa:v})}/><Input label="Identificação" value={form.identificacao} onChange={v => setForm({...form, identificacao:v})}/><button className="primary full">Salvar</button></form></Modal>}
      {showCrachaForm && <Modal title="Vincular crachá NFC" onClose={() => setShowCrachaForm(false)}><form onSubmit={addCracha}><label>Colaborador<select required value={form.colaborador_id} onChange={e => setForm({...form, colaborador_id:e.target.value})}><option value="">Selecione...</option>{colaboradores.filter(x=>x.ativo).map(x=><option key={x.id} value={x.id}>{x.nome} — {x.matricula || 'sem matrícula'}</option>)}</select></label><Input label="Código NFC *" value={form.codigo_nfc} onChange={v => setForm({...form, codigo_nfc:v})}/><button className="primary full">Salvar</button></form></Modal>}
    </main>
  );
}

function Stat({title,value}) { return <div className="stat"><span>{title}</span><strong>{value}</strong></div>; }
function Panel({title,action,children}) { return <section className="panel"><div className="panelHead"><h2>{title}</h2>{action}</div>{children}</section>; }
function Table({headers,rows}) { return rows.length ? <div className="tableWrap"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j}>{j===r.length-1 && (c==='Ativo'||c==='Inativo') ? <span className={c==='Ativo'?'badge ok':'badge'}>{c}</span> : c}</td>)}</tr>)}</tbody></table></div> : <Empty />; }
function Records({rows}) { return rows.length ? <div className="tableWrap"><table><thead><tr><th>Data/hora</th><th>Colaborador</th><th>Tipo</th><th>Veículo</th><th>Terminal</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{fmtDate(r.data_hora)}</td><td>{r.ponto_colaboradores?.nome || '-'}</td><td><span className={r.tipo==='entrada'?'badge ok':'badge'}>{r.tipo}</span></td><td>{r.ponto_veiculos?.placa || '-'}</td><td>{r.ponto_terminais?.nome || '-'}</td></tr>)}</tbody></table></div> : <Empty />; }
function Empty(){ return <div className="empty">Nenhum registro encontrado.</div>; }
function Input({label,value,onChange}) { return <label>{label}<input required={label.includes('*')} value={value} onChange={e=>onChange(e.target.value)} /></label>; }
function Modal({title,onClose,children}) { return <div className="overlay"><div className="modal"><div className="modalHead"><h2>{title}</h2><button onClick={onClose}>×</button></div>{children}</div></div>; }
