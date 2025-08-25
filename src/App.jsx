
import React, { useEffect, useMemo, useRef, useState } from "react";

// CriptoFlash

// Formatea un número como moneda en EUR
function numeroBonito(n) {
  try {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
  } catch {
    // Si fallara el formateo, se devuelve el número con 2 decimales
    return (Math.round(n * 100) / 100).toFixed(2) + " €";
  }
}

// Devuelve una clase CSS en función del signo del porcentaje
function porcentajeColor(p) {
  if (p > 0.05) return "text-green-600";
  if (p < -0.05) return "text-red-600";
  return "text-gray-500";
}

// Dibuja un sparkline sencillo en un <canvas> usando los datos dados
function usarSparkline(canvasRef, datos = []) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !datos || datos.length === 0) return;
    const ctx = canvas.getContext("2d");
    const w = (canvas.width = canvas.offsetWidth);
    const h = (canvas.height = canvas.offsetHeight);

    ctx.clearRect(0, 0, w, h);

    // Normalizar valores para ajustar a la altura disponible
    const valores = datos.map((x) => x ?? 0);
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    const rango = max - min || 1; // evitar división por cero

    // Línea de referencia en la mitad
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // Trazo del precio
    ctx.globalAlpha = 1;
    ctx.beginPath();
    valores.forEach((v, i) => {
      const x = (i / (valores.length - 1)) * w;
      const y = h - ((v - min) / rango) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [canvasRef, datos]);
}

export default function CriptoFlash() {
  const [listaMonedas, setListaMonedas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensajeError, setMensajeError] = useState("");
  const [busqueda, setBusqueda] = useState("");


  // Intervalo fijo: 15 segundos
  const INTERVALO_MS = 15000;
  const intervaloRef = useRef(null);

  // URL de CoinGecko (top 20, EUR, con % y sparkline)
  const urlApi = useMemo(() => {
    const params = new URLSearchParams({
      vs_currency: "eur",
      order: "market_cap_desc",
      per_page: "20",
      page: "1",
      price_change_percentage: "1h,24h,7d",
      sparkline: "true",
      locale: "es",
    });
    return `https://api.coingecko.com/api/v3/coins/markets?${params.toString()}`;
  }, []);

  // Pide datos a la API y actualiza el estado
  async function pedirDatos() {
    setMensajeError("");
    try {
      const res = await fetch(urlApi);
      if (!res.ok) throw new Error("Respuesta no válida de la API: " + res.status);
      const json = await res.json();
      setListaMonedas(Array.isArray(json) ? json : []);
      setCargando(false);
    } catch (err) {
      console.error(err);
      setMensajeError("No fue posible cargar precios en este momento. Intentalo más tarde.");
      setCargando(false);
    }
  }

  // Carga inicial y autorefresco fijo
  useEffect(() => {
    pedirDatos();
    if (intervaloRef.current) clearInterval(intervaloRef.current);
    intervaloRef.current = setInterval(pedirDatos, INTERVALO_MS);
    return () => clearInterval(intervaloRef.current);
  }, [urlApi]);

  // Filtro por nombre o símbolo
  const monedasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return listaMonedas;
    return listaMonedas.filter(
      (m) => (m.name || "").toLowerCase().includes(q) || (m.symbol || "").toLowerCase().includes(q)
    );
  }, [busqueda, listaMonedas]);

  // Componente de tarjeta para cada cripto
  function TarjetaMoneda({ moneda }) {
    const refCanvas = useRef(null);
    const serie = (moneda?.sparkline_in_7d?.price || []).slice(-50);
    usarSparkline(refCanvas, serie);

    const cambio24 = moneda?.price_change_percentage_24h ?? 0;

    return (
      <div className="rounded-2xl shadow-lg p-4 bg-white/80 backdrop-blur border border-zinc-200 hover:scale-[1.01] transition-transform">
        <div className="flex items-center gap-3">
          <img src={moneda.image} alt={moneda.name} className="w-8 h-8 rounded-full" />
          <div className="flex-1">
            <div className="font-semibold leading-tight">
              {moneda.name} <span className="uppercase text-zinc-400 text-xs">{moneda.symbol}</span>
            </div>
            <div className="text-sm text-zinc-500">
              #{moneda.market_cap_rank} · Vol 24h: {numeroBonito(moneda.total_volume || 0)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">{numeroBonito(moneda.current_price)}</div>
            <div className={"text-sm " + porcentajeColor(cambio24)}>
              {cambio24?.toFixed ? cambio24.toFixed(2) : cambio24}% 24h
            </div>
          </div>
        </div>
        <div className="mt-3 h-12">
          <canvas ref={refCanvas} className="w-full h-12"></canvas>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-zinc-100 to-white text-zinc-900 p-4">
      {/* Cabecera */}
      <header className="max-w-5xl mx-auto flex items-center gap-3 mb-4">
        <div className="text-2xl font-black tracking-tight">CriptoFlash ⚡</div>
        <div className="text-sm opacity-70">(Precios en euros · fuente: CoinGecko · refresco 15s)</div>
        <div className="flex-1" />
      </header>

      {/* Buscador */}
      <div className="max-w-5xl mx-auto mb-4">
        <input
          placeholder="Buscar por nombre o símbolo (ej: btc, eth, sol...)"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl border border-zinc-300 bg-white/80 backdrop-blur outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>

      {/* Contenido */}
      <main className="max-w-5xl mx-auto">
        {cargando ? (
          <div className="animate-pulse text-center opacity-70">
            Cargando precios...
            <div className="mt-3 mx-auto w-64 h-2 rounded-full bg-zinc-300/60"></div>
          </div>
        ) : mensajeError ? (
          <div className="text-center text-red-600 font-medium">{mensajeError}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {monedasFiltradas.map((m) => (
              <TarjetaMoneda key={m.id} moneda={m} />
            ))}
          </div>
        )}

        {/* Pie */}
        <footer className="mt-8 text-center text-xs opacity-60">
          Datos de mercado proporcionados por CoinGecko. Proyecto de demostración.
        </footer>
      </main>
    </div>
  );
}
