import React, { useContext, useState } from 'react';
import { TOKENS } from '../constants';
import { MultisigContext } from './context';
import { Button } from './button';
import { IpfsLink } from './links';


const PROPOSAL_TYPES = [
    {
        key: 'transfer_mutez',
        label: 'Transfer tez',
        summary: 'Transfer tez from the multisig to one or more tezos addresses.',
    },
    {
        key: 'transfer_token',
        label: 'Transfer token',
        summary: 'Transfer FA2 token editions from the multisig to one or more tezos addresses.',
    },
    {
        key: 'text',
        label: 'Text',
        summary: 'Approve a text or decision. No on-chain effect — the text is archived on IPFS and signals an off-chain action.',
    },
    {
        key: 'lambda',
        label: 'Lambda function',
        summary: 'Execute Michelson lambda code as the multisig, e.g. to administer another contract the multisig owns or call a contract entry point.',
        warning: 'Executing arbitrary smart contract code could compromise the multisig or have unexpected consequences. Have it reviewed by a trusted contract expert before voting.',
    },
    {
        key: 'add_user',
        label: 'Add user',
        summary: 'Add a new member to the multisig.',
        warning: 'The minimum vote threshold is not updated, so adding a member makes proposals easier to approve.',
    },
    {
        key: 'remove_user',
        label: 'Remove user',
        summary: 'Remove one of the current multisig members.',
        warning: 'The minimum vote threshold is not updated, so removing a member can make proposals harder to approve.',
    },
    {
        key: 'minimum_votes',
        label: 'Minimum votes',
        summary: 'Change the minimum number of positive votes required to approve proposals.',
        warning: 'Affects all active proposals at execution. Lowering it may make some immediately executable.',
    },
    {
        key: 'expiration_time',
        label: 'Expiration time',
        summary: 'Change the proposals expiration time, in days.',
        warning: 'Affects all active and expired proposals at execution. Raising it can revive expired proposals; lowering it can expire active ones.',
    },
];

function NoticePage({ children }) {
    return (
        <div className='create-proposals-page'>
            <div className='page-intro'>
                <h1>Create proposals</h1>
            </div>
            <section className='proposal-form-section proposal-form-section--notice'>
                <p>{children}</p>
            </section>
        </div>
    );
}

export function CreateProposalForms() {
    // Get the multisig context
    const context = useContext(MultisigContext);
    const [selected, setSelected] = useState(null);

    // Return if the user is not connected
    if (!context.userAddress) {
        return <NoticePage>You need to sync your wallet to be able to create proposals.</NoticePage>;
    }

    // Return if the user is not one of the multisig users
    if (!context.storage?.users.includes(context.userAddress)) {
        return <NoticePage>Only multisig users can create new proposals.</NoticePage>;
    }

    const activeType = PROPOSAL_TYPES.find(type => type.key === selected);

    const renderForm = () => {
        switch (selected) {
            case 'transfer_mutez':
                return <TransferTezProposalForm handleSubmit={context.createTransferMutezProposal} />;
            case 'transfer_token':
                return <TransferTokenProposalForm handleSubmit={context.createTransferTokenProposal} />;
            case 'text':
                return <TextProposalForm uploadFileToIpfs={context.uploadFileToIpfs} handleSubmit={context.createTextProposal} />;
            case 'lambda':
                return <LambdaFunctionProposalForm handleSubmit={context.createLambdaFunctionProposal} />;
            case 'add_user':
                return <AddUserProposalForm handleSubmit={context.createAddUserProposal} />;
            case 'remove_user':
                return <RemoveUserProposalForm users={context.storage.users} aliases={context.userAliases} handleSubmit={context.createRemoveUserProposal} />;
            case 'minimum_votes':
                return <MinimumVotesProposalForm defaultValue={context.storage.minimum_votes} handleSubmit={context.createMinimumVotesProposal} />;
            case 'expiration_time':
                return <ExpirationTimeProposalForm defaultValue={context.storage.expiration_time} handleSubmit={context.createExpirationTimeProposal} />;
            default:
                return null;
        }
    };

    return (
        <div className='create-proposals-page'>
            <div className='page-intro'>
                <h1>Create proposals</h1>
            </div>

            <div className='proposal-type-picker' role='tablist' aria-label='Proposal type'>
                {PROPOSAL_TYPES.map(type => (
                    <button
                        key={type.key}
                        type='button'
                        role='tab'
                        aria-selected={selected === type.key}
                        className={`proposal-type-option${selected === type.key ? ' is-active' : ''}`}
                        onClick={() => setSelected(type.key)}>
                        {type.label}
                    </button>
                ))}
            </div>

            {activeType ? (
                <section className='proposal-form-section'>
                    <h2>{activeType.label} proposal</h2>
                    <p>{activeType.summary}</p>
                    {activeType.warning && (
                        <p className='create-proposal-warning'>Warning: {activeType.warning}</p>
                    )}
                    {renderForm()}
                </section>
            ) : (
                <section className='proposal-form-section proposal-form-section--notice'>
                    <p>Choose a proposal type above to begin.</p>
                </section>
            )}
        </div>
    );
}

function TransferTezProposalForm(props) {
    // Set the component state
    const [transfers, setTransfers] = useState([
        { amount: 0, destination: '' }
    ]);

    // Define the on change handler
    const handleChange = (index, parameter, value) => {
        // Create a new transfers array
        const newTransfers = transfers.map((transfer, i) => {
            // Create a new transfer
            const newTransfer = {
                amount: transfer.amount,
                destination: transfer.destination
            };

            // Update the value if we are at the correct index position
            if (i === index) {
                newTransfer[parameter] = value;
            }

            return newTransfer;
        });

        // Update the component state
        setTransfers(newTransfers);
    };

    // Define the on click handler
    const handleClick = (e, increase) => {
        e.preventDefault();

        // Create a new transfers array
        const newTransfers = transfers.map((transfer) => (
            { amount: transfer.amount, destination: transfer.destination }
        ));

        // Add or remove a transfer from the list
        if (increase) {
            newTransfers.push({ amount: 0, destination: '' });
        } else if (newTransfers.length > 1) {
            newTransfers.pop();
        }

        // Update the component state
        setTransfers(newTransfers);
    };

    // Define the on submit handler
    const handleSubmit = e => {
        e.preventDefault();
        props.handleSubmit(
            transfers.map((transfer) => ({
                amount: transfer.amount * 1000000,
                destination: transfer.destination
            }))
        );
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className='form-input'>
                <div className='transfers-input'>
                    {transfers.map((transfer, index) => (
                        <div key={index} className='transfer-input'>
                            <label>Amount to transfer (ꜩ):
                                {' '}
                                <input
                                    type='number'
                                    min='0'
                                    step='0.000001'
                                    value={transfer.amount}
                                    onChange={e => handleChange(index, 'amount', e.target.value)}
                                />
                            </label>
                            <br />
                            <label>Destination address:
                                {' '}
                                <input
                                    type='text'
                                    spellCheck='false'
                                    minLength='36'
                                    maxLength='36'
                                    className='tezos-wallet-input'
                                    value={transfer.destination}
                                    onChange={e => handleChange(index, 'destination', e.target.value)}
                                />
                            </label>
                        </div>
                    ))}
                </div>
                <Button text='+' onClick={e => handleClick(e, true)} />
                {' '}
                <Button text='-' onClick={e => handleClick(e, false)} />
            </div>
            <input type='submit' value='send proposal' />
        </form>
    );
}

function TransferTokenProposalForm(props) {
    // Set the component state
    const [tokenContract, setTokenContract] = useState('');
    const [tokenId, setTokenId] = useState('');
    const [transfers, setTransfers] = useState([
        { amount: 0, destination: '' }
    ]);

    // Define the on change handler
    const handleChange = (index, parameter, value) => {
        // Create a new transfers array
        const newTransfers = transfers.map((transfer, i) => {
            // Create a new transfer
            const newTransfer = {
                amount: transfer.amount,
                destination: transfer.destination
            };

            // Update the value if we are at the correct index position
            if (i === index) {
                newTransfer[parameter] = value;
            }

            return newTransfer;
        });

        // Update the component state
        setTransfers(newTransfers);
    };

    // Define the on click handler
    const handleClick = (e, increase) => {
        e.preventDefault();

        // Create a new transfers array
        const newTransfers = transfers.map((transfer) => (
            { amount: transfer.amount, destination: transfer.destination }
        ));

        // Add or remove a transfer from the list
        if (increase) {
            newTransfers.push({ amount: 0, destination: '' });
        } else if (newTransfers.length > 1) {
            newTransfers.pop();
        }

        // Update the component state
        setTransfers(newTransfers);
    };

    // Define the on submit handler
    const handleSubmit = e => {
        e.preventDefault();

        // Create a new transfers array that makes use of the correct decimals
        const token = TOKENS.find(token => token.fa2 === tokenContract);
        const newTransfers = transfers.map(transfer => (
            { amount: token ? transfer.amount * token.decimals : transfer.amount, destination: transfer.destination }
        ));

        // Submit the proposal
        props.handleSubmit(tokenContract, tokenId, newTransfers);
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className='form-input'>
                <label>Token contract address:
                    {' '}
                    <input
                        type='text'
                        list='tokenContracts'
                        spellCheck='false'
                        minLength='36'
                        maxLength='36'
                        className='contract-address-input'
                        value={tokenContract}
                        onMouseDown={() => setTokenContract('')}
                        onChange={e => setTokenContract(e.target.value)}
                    />
                    <datalist id='tokenContracts'>
                        <option value=''></option>
                        {TOKENS.map((token) => (
                            <option key={token.fa2} value={token.fa2}>{token.name}</option>
                        ))}
                    </datalist>
                </label>
                <br />
                <label>Token Id:
                    {' '}
                    <input
                        type='number'
                        min='0'
                        step='1'
                        value={tokenId}
                        onChange={e => setTokenId(e.target.value)}
                    />
                </label>
                <br />
                <div className='transfers-input'>
                    {transfers.map((transfer, index) => (
                        <div key={index} className='transfer-input'>
                            <label>Token editions:
                                {' '}
                                <input
                                    type='number'
                                    min='1'
                                    step='1'
                                    value={transfer.amount}
                                    onChange={e => handleChange(index, 'amount', e.target.value)}
                                />
                            </label>
                            <br />
                            <label>Destination address:
                                {' '}
                                <input
                                    type='text'
                                    spellCheck='false'
                                    minLength='36'
                                    maxLength='36'
                                    className='tezos-wallet-input'
                                    value={transfer.destination}
                                    onChange={e => handleChange(index, 'destination', e.target.value)}
                                />
                            </label>
                        </div>
                    ))}
                </div>
                <Button text='+' onClick={e => handleClick(e, true)} />
                {' '}
                <Button text='-' onClick={e => handleClick(e, false)} />
            </div>
            <input type='submit' value='send proposal' />
        </form>
    );
}

function TextProposalForm(props) {
    // Set the component state
    const [file, setFile] = useState(undefined);
    const [ipfsPath, setIpfsPath] = useState(undefined);

    // Define the on change handler
    const handleChange = e => {
        setFile(e.target.files[0]);
        setIpfsPath(undefined);
    };

    // Define the on click handler
    const handleClick = async e => {
        e.preventDefault();

        // Update the component state
        setIpfsPath(await props.uploadFileToIpfs(file, true));
    };

    // Define the on submit handler
    const handleSubmit = e => {
        e.preventDefault();
        props.handleSubmit(ipfsPath);
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className='form-input'>
                <label>File with the text to approve:
                    {' '}
                    <input
                        type='file'
                        onChange={handleChange}
                    />
                </label>
                {file &&
                    <div>
                        <Button text={ipfsPath ? 'uploaded' : 'upload to IPFS'} onClick={handleClick} />
                        {' '}
                        {ipfsPath &&
                            <IpfsLink path={ipfsPath} />
                        }
                    </div>
                }
            </div>
            <input type='submit' value='send proposal' />
        </form>
    );
}

function LambdaFunctionProposalForm(props) {
    // Set the component state
    const [michelineCode, setMichelineCode] = useState('');

    // Define the on submit handler
    const handleSubmit = e => {
        e.preventDefault();
        props.handleSubmit(michelineCode);
    };

    return (
        <form onSubmit={handleSubmit}>
            <label className='form-input'>Lambda function code in Micheline format:
                {' '}
                <textarea
                    className='micheline-code'
                    spellCheck='false'
                    value={michelineCode}
                    onChange={e => setMichelineCode(e.target.value)}
                />
            </label>
            <input type='submit' value='send proposal' />
        </form>
    );
}

function AddUserProposalForm(props) {
    // Set the component state
    const [user, setUser] = useState('');

    // Define the on submit handler
    const handleSubmit = e => {
        e.preventDefault();
        props.handleSubmit(user);
    };

    return (
        <form onSubmit={handleSubmit}>
            <label className='form-input'>User to add:
                {' '}
                <input
                    type='text'
                    spellCheck='false'
                    minLength='36'
                    maxLength='36'
                    className='tezos-wallet-input'
                    value={user}
                    onChange={e => setUser(e.target.value)}
                />
            </label>
            <input type='submit' value='send proposal' />
        </form>
    );
}

function RemoveUserProposalForm(props) {
    // Set the component state
    const [user, setUser] = useState('');

    // Define the on submit handler
    const handleSubmit = e => {
        e.preventDefault();
        props.handleSubmit(user);
    };

    return (
        <form onSubmit={handleSubmit}>
            <label className='form-input'>User to remove:
                {' '}
                <input
                    type='text'
                    list='users'
                    spellCheck='false'
                    minLength='36'
                    maxLength='36'
                    className='contract-address-input'
                    value={user}
                    onMouseDown={() => setUser('')}
                    onChange={e => setUser(e.target.value)}
                />
                <datalist id='users'>
                    <option value=''></option>
                    {props.users.map((userWallet, index) => (
                        <option key={index} value={userWallet}>
                            {props.aliases ? props.aliases[userWallet] : userWallet}
                        </option>
                    ))}
                </datalist>
            </label>
            <input type='submit' value='send proposal' />
        </form>
    );
}

function MinimumVotesProposalForm(props) {
    // Set the component state
    const [minimumVotes, setMinimumVotes] = useState(props.defaultValue);

    // Define the on submit handler
    const handleSubmit = e => {
        e.preventDefault();
        props.handleSubmit(minimumVotes);
    };

    return (
        <form onSubmit={handleSubmit}>
            <label className='form-input'>New minimum votes:
                {' '}
                <input
                    type='number'
                    min='1'
                    step='1'
                    value={minimumVotes}
                    onChange={e => setMinimumVotes(Math.round(e.target.value))}
                />
            </label>
            <input type='submit' value='send proposal' />
        </form>
    );
}

function ExpirationTimeProposalForm(props) {
    // Set the component state
    const [expirationTime, setExpirationTime] = useState(props.defaultValue);

    // Define the on submit handler
    const handleSubmit = e => {
        e.preventDefault();
        props.handleSubmit(expirationTime);
    };

    return (
        <form onSubmit={handleSubmit}>
            <label className='form-input'>New expiration time (days):
                {' '}
                <input
                    type='number'
                    min='1'
                    step='1'
                    value={expirationTime}
                    onChange={e => setExpirationTime(Math.round(e.target.value))}
                />
            </label>
            <input type='submit' value='send proposal' />
        </form>
    );
}
