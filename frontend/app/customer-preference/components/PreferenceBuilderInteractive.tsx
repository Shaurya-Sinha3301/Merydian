'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import activeGroupsData from '@/lib/agent-dashboard/data/active_groups.json';
import upcomingGroupsData from '@/lib/agent-dashboard/data/upcoming_groups.json';
import itineraryDataFile from '@/lib/agent-dashboard/data/itinerary_data.json';

/* ─── Destination meta per group ─── */
const DESTINATION_META: Record<string, {
    city: string; country: string;
    lat: string; lng: string;
    sector: string;
}> = {
    GRP001: { city: 'GOA', country: 'INDIA', lat: '15.2993° N', lng: '74.1240° E', sector: 'LEISURE / COASTAL' },
    GRP002: { city: 'MANALI', country: 'INDIA', lat: '32.2432° N', lng: '77.1892° E', sector: 'ADVENTURE / MOUNTAIN' },
    GRP003: { city: 'KERALA', country: 'INDIA', lat: '9.4981° N', lng: '76.3388° E', sector: 'NATURE / CULTURAL' },
    GRP004: { city: 'JAIPUR', country: 'INDIA', lat: '26.8242° N', lng: '75.8122° E', sector: 'HERITAGE / LUXURY' },
    DEFAULT: { city: 'UNKNOWN', country: 'UNKNOWN', lat: '0.0000° N', lng: '0.0000° E', sector: 'MIXED' },
};

/* ─── Experience card catalogue ─── */
const EXPERIENCES = [
    { id: 'ID:001', title: 'Heritage Walk', desc: 'Guided walk through centuries-old monuments and living history.', category: 'ART & CULTURE', img: 'https://images.unsplash.com/photo-1567359781514-3b964e2b04d6?w=400&q=80' },
    { id: 'ID:002', title: 'Fine Dining Evening', desc: 'Curated multi-course dinner at an acclaimed restaurant.', category: 'GASTRONOMY', img: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80' },
    { id: 'ID:003', title: 'Sunset Cruise', desc: 'Golden hour sail with champagne and panoramic vistas.', category: 'LEISURE', img: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&q=80' },
    { id: 'ID:004', title: 'Local Market Tour', desc: 'Immersive tour of spice markets and artisan stalls.', category: 'SHOPPING', img: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&q=80' },
    { id: 'ID:005', title: 'Wildlife Safari', desc: 'Early-morning game drive in a protected reserve.', category: 'NATURE', img: 'https://images.unsplash.com/photo-1504173010664-32509107de4c?w=400&q=80' },
    { id: 'ID:006', title: 'Cultural Performance', desc: 'Front-row seats to a classical dance or theatre premiere.', category: 'CULTURE', img: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=400&q=80' },
    { id: 'ID:007', title: 'Adventure Trek', desc: 'Guided trek through scenic trails with expert naturalists.', category: 'ADVENTURE', img: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&q=80' },
    { id: 'ID:008', title: 'Spa & Wellness', desc: 'Signature treatment at an award-winning wellness retreat.', category: 'WELLNESS', img: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=400&q=80' },
    { id: 'ID:009', title: 'Cooking Masterclass', desc: 'Hands-on session with a local chef — learn authentic recipes.', category: 'CULINARY', img: 'https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=400&q=80' },
    { id: 'ID:010', title: 'Nightlife & Rooftop', desc: 'Reserved table at the city\'s most iconic rooftop bar.', category: 'NIGHTLIFE', img: 'https://images.unsplash.com/photo-1545128485-c400ce7b23d5?w=400&q=80' },
];

const MAX_SELECT = 5;

/* ─── Step indicator ─── */
const STEPS = [
    { label: 'PROFILE', active: false },
    { label: 'GROUP', active: false },
    { label: 'HUB', active: true },
    { label: 'VECTOR', active: false },
    { label: 'CONFIRM', active: false },
];

const PreferenceBuilderInteractive = () => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [selected, setSelected] = useState<string[]>([]);
    const [familyName, setFamilyName] = useState('');
    const [destMeta, setDestMeta] = useState(DESTINATION_META.DEFAULT);
    const [itineraryName, setItineraryName] = useState('');
    const [saveHovered, setSaveHovered] = useState(false);

    useEffect(() => {
        const familyId = sessionStorage.getItem('familyId');
        if (!familyId) { router.push('/customer-login'); return; }

        let foundFamily: any = null;
        let foundGroupId: string | null = null;

        for (const group of activeGroupsData.groups) {
            const fam = group.families.find((f: any) => f.id === familyId);
            if (fam) { foundFamily = fam; foundGroupId = group.id; break; }
        }
        if (!foundGroupId) {
            for (const group of upcomingGroupsData.groups) {
                const fam = group.families.find((f: any) => f.id === familyId);
                if (fam) { foundFamily = fam; foundGroupId = group.id; break; }
            }
        }
        if (!foundFamily) { router.push('/customer-login'); return; }

        const itin = itineraryDataFile.itineraries.find((i: any) => i.groupId === foundGroupId);
        setFamilyName(foundFamily.family_name || 'Family');
        setItineraryName(itin?.itineraryName || '');
        setDestMeta(DESTINATION_META[foundGroupId ?? 'DEFAULT'] ?? DESTINATION_META.DEFAULT);
        setIsLoading(false);
    }, [router]);

    const toggle = (id: string) => {
        setSelected(prev => {
            if (prev.includes(id)) return prev.filter(x => x !== id);
            if (prev.length >= MAX_SELECT) return prev;
            return [...prev, id];
        });
    };

    const handleSave = () => {
        if (selected.length === MAX_SELECT) {
            sessionStorage.setItem('preferenceVectors', JSON.stringify(selected));
            router.push('/customer-portal');
        }
    };

    /* ── Loading ── */
    if (isLoading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', fontFamily: "'Outfit', sans-serif" }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 36, height: 36, border: '2px solid #1a1a1a', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
                    <p style={{ color: '#717171', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Preparing calibration engine...</p>
                </div>
            </div>
        );
    }

    const canSave = selected.length === MAX_SELECT;

    return (
        <div style={{ display: 'flex', height: '100vh', fontFamily: "'Outfit', sans-serif", background: '#fafafa', color: '#1a1a1a', overflow: 'hidden' }}>

            {/* ════ LEFT DARK PANEL ════ */}
            <aside style={{
                width: 280,
                height: '100vh',
                background: '#111',
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                padding: '40px 32px',
                flexShrink: 0,
                position: 'sticky',
                top: 0,
                overflow: 'hidden',
            }}>

                {/* Decorative blueprint cross */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.04,
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
                    backgroundSize: '32px 32px', pointerEvents: 'none'
                }} />

                {/* Version badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 36 }}>
                    <div style={{ width: 6, height: 6, background: '#c5a065' }} />
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: '#c5a065', fontFamily: "'JetBrains Mono', monospace" }}>
                        PROFILING_V3
                    </span>
                </div>

                {/* Destination */}
                <div style={{ marginBottom: 32 }}>
                    <h1 style={{ fontSize: 52, fontWeight: 200, letterSpacing: '-0.01em', margin: '0 0 4px', lineHeight: 1, color: '#fff' }}>
                        {destMeta.city}
                    </h1>
                    <h2 style={{ fontSize: 18, fontWeight: 300, letterSpacing: '0.2em', margin: '0 0 20px', color: '#717171', textTransform: 'uppercase' }}>
                        {destMeta.country}
                    </h2>
                    {/* Separator */}
                    <div style={{ width: 32, height: 1, background: '#c5a065', marginBottom: 20 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {[
                            { k: 'COORD', v: `${destMeta.lat}, ${destMeta.lng}` },
                            { k: 'SECTOR', v: destMeta.sector },
                            { k: 'STATUS', v: 'ACTIVE' },
                        ].map(({ k, v }) => (
                            <div key={k} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                                <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', color: '#555', fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>{k}:</span>
                                <span style={{ fontSize: 10, color: '#aaa', fontFamily: "'JetBrains Mono', monospace" }}>{v}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Objective */}
                <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: 24, marginBottom: 'auto' }}>
                    <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', color: '#c5a065', display: 'block', marginBottom: 12, fontFamily: "'JetBrains Mono', monospace" }}>
                        CURRENT OBJECTIVE
                    </span>
                    <p style={{ fontSize: 22, fontWeight: 300, color: '#fff', lineHeight: 1.5, margin: 0 }}>
                        Construct your interest vector. Select experiences to calibrate the recommendation engine.
                    </p>
                </div>

                {/* Footer: core location */}
                <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: 20, marginTop: 32 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                            <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', color: '#555', display: 'block', marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>CORE LOCATION</span>
                            <span style={{ fontSize: 18, fontWeight: 600, color: '#fff', letterSpacing: '0.05em' }}>{destMeta.city}</span>
                        </div>
                        {/* Map-pin icon */}
                        <svg width="18" height="22" viewBox="0 0 24 28" fill="none">
                            <path d="M12 0C7.13 0 3 4.13 3 9c0 6.75 9 19 9 19s9-12.25 9-19c0-4.87-4.13-9-9-9zm0 12.25A3.25 3.25 0 118.75 9 3.25 3.25 0 0112 12.25z" fill="#c5a065" />
                        </svg>
                    </div>
                </div>
            </aside>

            {/* ════ RIGHT MAIN AREA ════ */}
            <main style={{
                flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden',
                backgroundImage: 'linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
            }}>

                {/* ── Header Row ── */}
                <div style={{ padding: '36px 48px 0', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                    <div>
                        <h2 style={{ fontSize: 32, fontWeight: 300, letterSpacing: '-0.01em', margin: '0 0 4px', color: '#1a1a1a' }}>
                            Interest Calibration
                        </h2>
                        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: '#717171', margin: 0, textTransform: 'uppercase' }}>
                            Select {MAX_SELECT} Key Vectors
                        </p>
                    </div>

                    {/* Selection status + button */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', color: '#717171', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
                                Selection Status
                            </span>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                                <span style={{
                                    fontSize: 28, fontWeight: 600, color: selected.length === MAX_SELECT ? '#c5a065' : '#1a1a1a',
                                    fontFamily: "'JetBrains Mono', monospace", transition: 'color 0.3s'
                                }}>
                                    {selected.length}
                                </span>
                                <span style={{ fontSize: 16, color: '#aaa', fontFamily: "'JetBrains Mono', monospace" }}>&nbsp;/&nbsp;{MAX_SELECT}</span>
                            </div>
                        </div>

                        {/* Reset */}
                        {selected.length > 0 && (
                            <button
                                onClick={() => setSelected([])}
                                style={{
                                    width: 34, height: 34, borderRadius: '50%',
                                    border: '1px solid #e5e5e5', background: '#fff',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#717171', fontSize: 14, transition: 'border-color 0.2s',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.borderColor = '#1a1a1a')}
                                onMouseLeave={e => (e.currentTarget.style.borderColor = '#e5e5e5')}
                                title="Reset selection"
                            >
                                ↺
                            </button>
                        )}

                        {/* Save Preferences CTA */}
                        <button
                            onClick={handleSave}
                            disabled={!canSave}
                            onMouseEnter={() => setSaveHovered(true)}
                            onMouseLeave={() => setSaveHovered(false)}
                            style={{
                                padding: '12px 24px',
                                border: 'none',
                                borderBottom: canSave ? '2px solid transparent' : '2px solid transparent',
                                background: canSave
                                    ? (saveHovered ? 'linear-gradient(135deg, #8fa391 0%, #d4c86a 50%, #c5a065 100%)' : '#1a1a1a')
                                    : '#f0f0f0',
                                color: canSave ? '#fff' : '#bbb',
                                fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase',
                                cursor: canSave ? 'pointer' : 'not-allowed',
                                transition: 'all 0.3s',
                                display: 'flex', alignItems: 'center', gap: 8,
                                fontFamily: "'Outfit', sans-serif",
                                boxShadow: canSave && saveHovered ? '0 4px 20px rgba(197,160,101,0.3)' : 'none',
                            }}
                        >
                            SAVE PREFERENCES
                            <span style={{ fontSize: 14, transition: 'transform 0.2s', transform: saveHovered && canSave ? 'translateX(3px)' : 'none', display: 'inline-block' }}>→</span>
                        </button>
                    </div>
                </div>

                {/* ── Instruction line ── */}
                {selected.length < MAX_SELECT && (
                    <div style={{ padding: '12px 48px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 20, height: 1, background: '#e5e5e5' }} />
                        <span style={{ fontSize: 10, color: '#aaa', letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace" }}>
                            {MAX_SELECT - selected.length} more selection{MAX_SELECT - selected.length !== 1 ? 's' : ''} required to activate
                        </span>
                    </div>
                )}

                {/* ── Experience Cards Grid (scrollable) ── */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '28px 48px 64px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {EXPERIENCES.map((exp) => {
                            const isSelected = selected.includes(exp.id);
                            const isMaxed = selected.length >= MAX_SELECT && !isSelected;
                            return (
                                <ExperienceCard
                                    key={exp.id}
                                    exp={exp}
                                    isSelected={isSelected}
                                    isMaxed={isMaxed}
                                    onToggle={() => toggle(exp.id)}
                                />
                            );
                        })}
                    </div>
                </div>
            </main>

            {/* CSS */}
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500;600;700&family=JetBrains+Mono:wght@300;400;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; }
        ::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
      `}</style>
        </div>
    );
};

/* ─── Experience Card Sub-Component ─── */
const ExperienceCard = ({
    exp, isSelected, isMaxed, onToggle,
}: {
    exp: typeof EXPERIENCES[0];
    isSelected: boolean;
    isMaxed: boolean;
    onToggle: () => void;
}) => {
    const [imgHovered, setImgHovered] = useState(false);
    const [cardHovered, setCardHovered] = useState(false);

    return (
        /* Wrapper: position:relative, no overflow — corner ticks live here and are never clipped */
        <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setCardHovered(true)}
            onMouseLeave={() => setCardHovered(false)}
        >
            {/* Corner ticks on HOVER only — on wrapper so they're never clipped */}
            {cardHovered && !isSelected && !isMaxed && (
                <>
                    {([['top', 'left'], ['top', 'right'], ['bottom', 'left'], ['bottom', 'right']] as [string, string][]).map(([v, h]) => (
                        <div key={`${v}-${h}`} style={{
                            position: 'absolute',
                            top: v === 'top' ? -1 : undefined,
                            bottom: v === 'bottom' ? -1 : undefined,
                            left: h === 'left' ? -1 : undefined,
                            right: h === 'right' ? -1 : undefined,
                            width: 10, height: 10, zIndex: 4, pointerEvents: 'none',
                            borderTop: v === 'top' ? '2px solid #c5a065' : 'none',
                            borderBottom: v === 'bottom' ? '2px solid #c5a065' : 'none',
                            borderLeft: h === 'left' ? '2px solid #c5a065' : 'none',
                            borderRight: h === 'right' ? '2px solid #c5a065' : 'none',
                        }} />
                    ))}
                </>
            )}

            {/* Inner card: overflow:hidden keeps image perfectly flush with border */}
            <div
                onClick={!isMaxed ? onToggle : undefined}
                style={{
                    background: '#fff',
                    border: isSelected ? '1.5px solid #c5a065' : '1px solid #e5e5e5',
                    display: 'flex',
                    gap: 0,
                    height: 96,
                    overflow: 'hidden',
                    cursor: isMaxed ? 'not-allowed' : 'pointer',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    opacity: isMaxed ? 0.45 : 1,
                    position: 'relative',
                    boxShadow: isSelected ? '0 0 0 3px rgba(197,160,101,0.12)' : 'none',
                }}
            >

                {/* Thumbnail */}
                <div
                    style={{ width: 96, height: 96, flexShrink: 0, overflow: 'hidden', background: '#f0f0f0', position: 'relative' }}
                    onMouseEnter={() => setImgHovered(true)}
                    onMouseLeave={() => setImgHovered(false)}
                >
                    {/* ID badge */}
                    <div style={{
                        position: 'absolute', top: 0, left: 0,
                        background: isSelected ? '#c5a065' : '#1a1a1a',
                        color: '#fff', fontSize: 8, fontWeight: 700,
                        padding: '2px 6px', zIndex: 2,
                        fontFamily: "'JetBrains Mono', monospace",
                        letterSpacing: '0.05em',
                        transition: 'background 0.2s',
                    }}>
                        {exp.id}
                    </div>
                    <img
                        src={exp.img}
                        alt={exp.title}
                        style={{
                            width: '100%', height: '100%', objectFit: 'cover',
                            filter: imgHovered || isSelected ? 'none' : 'grayscale(80%) brightness(1.1)',
                            transition: 'filter 0.3s',
                        }}
                    />
                </div>

                {/* Content */}
                <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                        <h3 style={{
                            fontSize: 15, fontWeight: isSelected ? 600 : 500,
                            color: isSelected ? '#1a1a1a' : '#1a1a1a',
                            margin: '0 0 4px', lineHeight: 1.2,
                        }}>
                            {exp.title}
                        </h3>
                        <p style={{ fontSize: 12, color: '#717171', margin: 0, lineHeight: 1.5, fontWeight: 300 }}>
                            {exp.desc}
                        </p>
                    </div>

                    {/* Category + checkmark */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                        <span style={{
                            fontSize: 8, fontWeight: 700, letterSpacing: '0.15em',
                            color: isSelected ? '#c5a065' : '#aaa',
                            fontFamily: "'JetBrains Mono', monospace",
                            transition: 'color 0.2s',
                        }}>
                            {exp.category}
                        </span>

                        {/* Checkmark circle */}
                        <div style={{
                            width: 20, height: 20, borderRadius: '50%',
                            border: isSelected ? '2px solid #c5a065' : '1.5px solid #d0d0d0',
                            background: isSelected ? '#c5a065' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s',
                            flexShrink: 0,
                        }}>
                            {isSelected && (
                                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                    <path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PreferenceBuilderInteractive;
