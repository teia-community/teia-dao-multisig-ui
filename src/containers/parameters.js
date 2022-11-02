import React, { useContext } from 'react';
import { NETWORK } from '../constants';
import { MultisigContext } from './context';
import { TezosAddressLink } from './links';
import { Button } from './button';


export function Parameters() {
    // Get the required multisig context information
    const { userAddress, contractAddress, storage, balance, connectWallet, acceptMembership, leaveMultisig } = useContext(MultisigContext);

    return (
        <>
            <section>
                <h2>User information</h2>
                <ul className='parameters-list'>
                    <li>Address: {userAddress ? <TezosAddressLink address={userAddress} /> : <Button text='sync wallet' onClick={() => connectWallet()} />}</li>
                    {storage?.proposed_users.includes(userAddress) &&
                        <li>
                            <Button text='Accept membership' onClick={() => acceptMembership(true)} />
                            {' '}
                            <Button text='Decline membership' onClick={() => acceptMembership(false)} />
                        </li>
                    }
                    {storage?.users.includes(userAddress) &&
                        <li>
                            <Button text='Leave multisig' onClick={leaveMultisig} />
                        </li>
                    }
                </ul>
            </section>
            <section>
                <h2>Main parameters</h2>
                <ul className='parameters-list'>
                    <li>Multisig users:
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
                    </li>
                    <li>Multisig proposed users:
                        <ul className='users-list'>
                            {storage?.proposed_users.map((user, index) => (
                                <li key={index}>
                                    <TezosAddressLink
                                        address={user}
                                        className={user === userAddress && 'is-user'}
                                        useAlias
                                    />
                                </li>
                            ))}
                        </ul>
                    </li>
                    <li>Contract address: <TezosAddressLink address={contractAddress} /></li>
                    <li>Network: {NETWORK}</li>
                    <li>Positive votes needed to execute a proposal: {storage?.minimum_votes} votes</li>
                    <li>Proposal expiration time: {storage?.expiration_time} days</li>
                    <li>Balance: {balance ? balance / 1000000 : '0'} ꜩ</li>
                </ul>
            </section>
        </>
    );
}
