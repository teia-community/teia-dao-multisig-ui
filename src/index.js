import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { App, MultisigMembers, MultisigParameters, MultisigProposalDetails, MultisigProposals, CreateProposals, NotFound } from './App';
import reportWebVitals from './reportWebVitals';
import './styles/index.scss';


const root = createRoot(document.getElementById('root'));

root.render(
    <React.StrictMode>
        <HashRouter>
            <Routes>
                <Route path='/' element={<App />}>
                    <Route index element={<MultisigParameters />} />
                    <Route path='proposals' element={<MultisigProposals />} />
                    <Route path='proposals/:proposalId' element={<MultisigProposalDetails />} />
                    <Route path='members' element={<MultisigMembers />} />
                    <Route path='create' element={<CreateProposals />} />
                    <Route path='*' element={<NotFound />} />
                </Route>
            </Routes>
        </HashRouter>
    </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
