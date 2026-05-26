import React, { useContext } from 'react';
import { NETWORK } from '../constants';
import { MultisigContext } from './context';
import { TezosAddressLink } from './links';
import { Button } from './button';
import { formatMutezAmount } from './utils';


export function Parameters() {
    // Get the required multisig context information
    const { userAddress, contractAddress, storage, balance, connectWallet, acceptMembership, leaveMultisig } = useContext(MultisigContext);
    const pendingUsers = storage?.proposed_users || [];
    const summaryItems = [
        {
            label: 'wallet',
            value: userAddress ? <TezosAddressLink address={userAddress} shorten useAlias /> : 'not synced',
            extra: userAddress ? 'connected' : 'sync to vote or propose',
        },
        {
            label: 'contract',
            value: contractAddress ? <TezosAddressLink address={contractAddress} shorten /> : 'unknown',
            extra: NETWORK,
        },
        {
            label: 'members',
            value: storage ? storage.users.length : '--',
            extra: storage ? `quorum ${storage.minimum_votes}` : 'loading contract state',
        },
        {
            label: 'balance',
            value: balance === undefined ? '--' : `${formatMutezAmount(balance)} XTZ`,
            extra: storage ? `${storage.expiration_time} day expiry` : 'loading contract state',
        },
    ];

    return (
        <div className='parameters-page'>
            <div className='page-intro'>
                <h1>Teia Core Team Multisig</h1>
                <p className='page-intro__copy'>Contract state, membership status, and the current multisig roster.</p>
            </div>

            <div className='status-strip status-strip--compact'>
                {summaryItems.map(item => (
                    <div key={item.label} className='status-strip__item'>
                        <span className='status-strip__label'>{item.label}</span>
                        <span className='status-strip__value'>{item.value}</span>
                        <span className='status-strip__extra'>{item.extra}</span>
                    </div>
                ))}
            </div>

            <section className='parameters-section'>
                <h2>Membership</h2>
                <ul className='parameters-list'>
                    <li>Address: {userAddress ? <TezosAddressLink address={userAddress} /> : <Button text='sync wallet' onClick={() => connectWallet()} />}</li>
                    {storage?.proposed_users?.includes(userAddress) &&
                        <li>
                            <Button text='Accept membership' onClick={() => acceptMembership(true)} />
                            {' '}
                            <Button text='Decline membership' onClick={() => acceptMembership(false)} />
                        </li>
                    }
                    {storage?.users?.includes(userAddress) &&
                        <li>
                            <Button text='Leave multisig' onClick={leaveMultisig} />
                        </li>
                    }
                </ul>
            </section>
            <section className='parameters-section'>
                <h2>Roster</h2>
                <div className='parameters-list'>
                    <div>
                        <h3>Multisig users</h3>
                        <ul className='users-list'>
                            {storage?.users.map((user, index) => (
                                <li key={index}>
                                    <TezosAddressLink
                                        address={user}
                                        className={user === userAddress && 'is-user'}
                                        useAlias
                                    />
                                </li>
                            ))}
                        </ul>
                    </div>
                    {pendingUsers.length > 0 && (
                        <div>
                            <h3>Pending membership responses</h3>
                            <ul className='users-list'>
                                {pendingUsers.map((user, index) => (
                                    <li key={`${user}-${index}`}>
                                        <TezosAddressLink
                                            address={user}
                                            className={user === userAddress && 'is-user'}
                                            useAlias
                                        />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
