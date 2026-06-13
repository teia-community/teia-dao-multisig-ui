import React, { useContext } from 'react';
import { NETWORK } from '../constants';
import { MultisigContext } from './context';
import { DefaultLink, TezosAddressLink } from './links';
import { Button } from './button';
import { buildContractLink, formatMutezAmount, shortenAddress } from './utils';


export function Parameters() {
    // Get the required multisig context information
    const { userAddress, contractAddress, storage, balance, userAliases, connectWallet, acceptMembership, leaveMultisig } = useContext(MultisigContext);
    const pendingUsers = storage?.proposed_users || [];
    const alias = userAliases && userAddress && userAliases[userAddress];

    let standing;
    if (!storage) {
        standing = { text: 'checking membership', className: 'is-muted' };
    } else if (storage.users.includes(userAddress)) {
        standing = { text: 'core team member', className: 'is-attention' };
    } else if (storage.proposed_users.includes(userAddress)) {
        standing = { text: 'membership invite pending', className: 'is-ready' };
    } else {
        standing = { text: 'not a member', className: 'is-muted' };
    }

    return (
        <div className='parameters-page'>
            <div className='page-intro'>
                <h1>Teia Core Team Multisig</h1>
                <p className='page-intro__copy'>Contract state, membership status, and the current multisig roster.</p>
            </div>

            <div className='status-line' aria-label='Multisig overview'>
                <p className='status-line__primary mono-text'>
                    <span className='status-line__caret'>{'▶'}</span>
                    {userAddress ? (
                        <>
                            <span className='status-line__stat is-muted'>synced as {alias || shortenAddress(userAddress, 6, 5)}</span>
                            <span className='status-line__sep'>·</span>
                            <span className={`status-line__stat ${standing.className}`}>{standing.text}</span>
                        </>
                    ) : (
                        <>
                            <span className='status-line__stat is-muted'>wallet not synced</span>
                            <span className='status-line__sep'>·</span>
                            <span className='status-line__stat is-muted'>sync to vote or propose</span>
                        </>
                    )}
                </p>
                <p className='status-line__identity mono-text'>
                    {contractAddress ? (
                        <DefaultLink href={buildContractLink(contractAddress)} className='status-line__contract'>
                            {shortenAddress(contractAddress, 6, 5)}
                        </DefaultLink>
                    ) : (
                        <span>unknown</span>
                    )}
                    <span className='status-line__sep'>·</span>
                    <span>{NETWORK}</span>
                    <span className='status-line__sep'>·</span>
                    <span>{storage ? storage.users.length : '--'} members</span>
                    <span className='status-line__sep'>·</span>
                    <span>quorum {storage ? storage.minimum_votes : '--'}</span>
                    <span className='status-line__sep'>·</span>
                    <span>{balance === undefined ? '--' : `${formatMutezAmount(balance)} XTZ`}</span>
                    <span className='status-line__sep'>·</span>
                    <span>{storage ? `${storage.expiration_time} day expiry` : '--'}</span>
                </p>
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
