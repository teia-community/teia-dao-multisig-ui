import React from 'react';
import { Outlet } from 'react-router-dom';
import { MultisigContextProvider } from './containers/context';
import { Header } from './containers/header';
import { Footer } from './containers/footer';
import { Parameters } from './containers/parameters';
import { Proposals } from './containers/proposals';
import { CreateProposalForms } from './containers/forms';


export function App() {
    return (
        <MultisigContextProvider>
            <div className='app-container'>
                <Header />
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
