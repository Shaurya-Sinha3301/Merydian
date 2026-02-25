'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function CustomerSidebar({ activeTab }: { activeTab: 'dashboard' | 'portal' | 'bookings' }) {
    const router = useRouter();
    const [familyInitial, setFamilyInitial] = useState('F');

    useEffect(() => {
        const famName = sessionStorage.getItem('familyName') || 'Family';
        setFamilyInitial(famName.charAt(0).toUpperCase());
    }, []);

    const handleLogout = () => {
        sessionStorage.removeItem('familyId');
        router.push('/customer-login');
    };

    return (
        <aside style={{
            width: 80,
            borderRight: '1px solid #e5e5e5',
            background: '#fff',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 20,
            boxShadow: '4px 0 24px rgba(0,0,0,0.02)',
            flexShrink: 0
        }}>
            {/* Logo */}
            <div style={{ height: 80, borderBottom: '1px solid #e5e5e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 40, height: 40, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{familyInitial}</span>
                </div>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 32, paddingBottom: 32, gap: 4 }}>
                {[
                    { id: 'dashboard', icon: '⊞', label: 'HUB', path: '/customer-dashboard' },
                    { id: 'portal', icon: '◈', label: 'PLAN', path: '/customer-portal' },
                    { id: 'bookings', icon: '⬛', label: 'DOCS', path: '/customer-bookings' }
                ].map(({ id, icon, label, path }) => {
                    const isActive = id === activeTab;
                    return (
                        <button
                            key={id}
                            onClick={() => router.push(path)}
                            style={{
                                width: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                paddingTop: 16,
                                paddingBottom: 16,
                                cursor: 'pointer',
                                background: isActive ? 'rgba(0,0,0,0.02)' : 'transparent',
                                border: 'none',
                                borderRight: isActive ? '2px solid #1a1a1a' : '2px solid transparent',
                                color: isActive ? '#1a1a1a' : '#717171',
                                transition: 'all 0.2s',
                                gap: 4,
                            }}
                        >
                            <span style={{ fontSize: 20 }}>{icon}</span>
                            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em' }}>{label}</span>
                        </button>
                    );
                })}
            </nav>

            {/* User avatar / Logout */}
            <div style={{ height: 80, borderTop: '1px solid #e5e5e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button
                    onClick={handleLogout}
                    title="Logout"
                    style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: '#1a1a1a',
                        border: '1px solid #333',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: '#fff', fontSize: 14, fontWeight: 700,
                    }}
                >
                    {familyInitial}
                </button>
            </div>
        </aside>
    );
}
