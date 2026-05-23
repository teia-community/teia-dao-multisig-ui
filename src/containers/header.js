import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { MultisigContext } from './context';
import { TezosAddressLink } from './links';
import { Button } from './button';


export function Header({ darkMode, toggleDarkMode }) {
    return (
        <header className='header-container'>
            <Navigation />
            <Wallet darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
        </header>
    );
}


export function Navigation() {
    return (
        <nav>
            <ul>
                <li>
                    <NavLink to='/'>Home</NavLink>
                </li>
                <li>
                    <NavLink to='/proposals'>Proposals</NavLink>
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
