import React, { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { MultisigContextProvider } from './containers/context';
import { Header } from './containers/header';
import { Footer } from './containers/footer';
import { Parameters } from './containers/parameters';
import { Proposals } from './containers/proposals';
import { CreateProposalForms } from './containers/forms';

function getInitialDarkMode() {
    const stored = localStorage.getItem('darkMode');
    if (stored !== null) return stored === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function App() {
    const [darkMode, setDarkMode] = useState(getInitialDarkMode);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
        localStorage.setItem('darkMode', darkMode);
    }, [darkMode]);

    const toggleDarkMode = useCallback(() => setDarkMode(d => !d), []);

    return (
        <MultisigContextProvider>
            <div className='app-container'>
                <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
                <Outlet />
                <Footer />
            </div>
        </MultisigContextProvider>
    );
}

export function MultisigParameters() {
    return (
        <main>
            <h1>Teia Core Team Multisig</h1>
            <Parameters />
        </main>
    );
}

export function MultisigProposals() {
    return (
        <main>
            <h1>Multisig proposals</h1>
            <Proposals />
        </main>
    );
}

export function CreateProposals() {
    return (
        <main>
            <h1>Create new proposals</h1>
            <CreateProposalForms />
        </main>
    );
}

export function NotFound() {
    return (
        <main>
            <p>Page not found...</p>
        </main>
    );
}
