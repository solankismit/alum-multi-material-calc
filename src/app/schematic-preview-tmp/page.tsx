import WindowSchematic from "@/components/WindowSchematic";

export default function Preview() {
  const cases = [
    { trackType: "2-track", configuration: "all-glass", widthMm: 1200, heightMm: 1200 },
    { trackType: "2-track", configuration: "glass-mosquito", widthMm: 1200, heightMm: 1200 },
    { trackType: "3-track", configuration: "all-glass", widthMm: 1800, heightMm: 1200 },
    { trackType: "3-track", configuration: "glass-mosquito", widthMm: 1800, heightMm: 1200 },
    { trackType: "openable", configuration: "glass-mosquito", sections: 2, widthMm: 1200, heightMm: 1500 },
    { trackType: "openable", configuration: "all-glass", sections: 3, widthMm: 1200, heightMm: 1500 },
    // { trackType: "openable", configuration: "glass", sections: 4, widthMm: 1200, heightMm: 1500 },
    // { trackType: "openable", configuration: "glass-mosquito", sections: 5, widthMm: 1200, heightMm: 1500 },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24, padding: 24, background: "#f8fafc" }}>
      {cases.map((c, i) => (
        <div key={i}>
          <h3>{c.trackType} / {c.configuration}</h3>
          <WindowSchematic {...c} />
        </div>
      ))}
    </div>
  );
}
