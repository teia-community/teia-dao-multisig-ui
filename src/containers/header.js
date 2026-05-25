import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { MultisigContext } from './context';
import { TezosAddressLink } from './links';
import { Button } from './button';
import { buildProposalRecords } from './utils';


export function Header({ darkMode, toggleDarkMode }) {
    return (
        <header className='header-container'>
            <Navigation />
            <Wallet darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
        </header>
    );
}


export function Navigation() {
    const context = useContext(MultisigContext);
    const proposalRecords = buildProposalRecords({
        storage: context.storage,
        proposals: context.proposals,
        voteRecords: context.voteRecords,
        proposalOperations: context.proposalOperations,
        voteOperations: context.voteOperations,
        executeOperations: context.executeOperations,
        storageHistory: context.storageHistory,
        userAddress: context.userAddress,
    });
    const awaitingCount = proposalRecords.filter(proposalRecord => proposalRecord.isAwaitingUser).length;

    return (
        <nav>
            <ul>
                <li>
                    <NavLink to='/'>Home</NavLink>
                </li>
                <li>
                    <NavLink to='/proposals'>
                        Proposals
                        {awaitingCount > 0 && <span className='nav-badge'>{awaitingCount}</span>}
                    </NavLink>
                </li>
                <li>
                    <NavLink to='/members'>Members</NavLink>
                </li>
                <li>
                    <NavLink to='/create'>Create proposals</NavLink>
                </li>
            </ul>
        </nav>
    );
}

export function Wallet({ darkMode, toggleDarkMode }) {
    const { userAddress, connectWallet, disconnectWallet } = useContext(MultisigContext);

    return (
        <div className='sync-container'>
            {userAddress &&
                <TezosAddressLink address={userAddress} shorten />
            }
            {userAddress ?
                <Button text='unsync' onClick={() => disconnectWallet()} /> :
                <Button text='sync' onClick={() => connectWallet()} />
            }
            <Button text={darkMode ? 'light' : 'dark'} onClick={toggleDarkMode} />
        </div>
    );
}
