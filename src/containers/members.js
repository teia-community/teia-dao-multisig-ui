import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from './dashboard-components';
import { MultisigContext } from './context';
import { DefaultLink, TezosAddressLink } from './links';
import {
    buildAccountOperationsLink,
    buildMembersDirectory,
    buildProposalRecords,
} from './utils';


function ParticipationBar({ eligible, no, yes }) {
    const yesWidth = eligible > 0 ? yes / eligible * 100 : 0;
    const noWidth = eligible > 0 ? no / eligible * 100 : 0;

    return (
        <div className='participation-bar'>
            <div className='participation-bar__track'>
                <span className='participation-bar__yes' style={{ width: `${yesWidth}%` }} />
                <span className='participation-bar__no' style={{ width: `${noWidth}%`, left: `${yesWidth}%` }} />
            </div>
            <span className='participation-bar__copy'>
                {yes + no}/{eligible} participated
            </span>
            {no > 0 && <span className='participation-bar__no-copy'>{no} no</span>}
        </div>
    );
}

function LoadingState() {
    return (
        <section className='dashboard-section'>
            <p>Loading members and participation history...</p>
        </section>
    );
}

export function MembersDirectory() {
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

    if (!(context.storage && context.proposals && context.voteRecords)) {
        return <LoadingState />;
    }

    const rows = buildMembersDirectory(proposalRecords, context.storage.users);

    return (
        <section className='dashboard-section members-section'>
            <div className='dashboard-section__header'>
                <div>
                    <h2>Members</h2>
                    <p className='dashboard-section__subtitle'>
                        Participation is measured only across proposals where a member was eligible at proposal close or execution time.
                    </p>
                </div>
            </div>

            <div className='members-table'>
                <div className='members-table__head'>
                    <span></span>
                    <span>member</span>
                    <span>address</span>
                    <span>participation</span>
                    <span>last vote</span>
                    <span>ops</span>
                </div>

                {rows.map(row => {
                    const alias = context.userAliases && context.userAliases[row.address];
                    const isUser = row.address === context.userAddress;

                    return (
                        <div key={row.address} className={`members-table__row${isUser ? ' is-user' : ''}`}>
                            <Avatar address={row.address} />
                            <div className='members-table__member'>
                                <strong>{alias || 'No alias'}</strong>
                                {isUser && <span>(you)</span>}
                            </div>
                            <TezosAddressLink address={row.address} shorten />
                            <ParticipationBar eligible={row.eligible} no={row.no} yes={row.yes} />
                            {row.lastProposalId ? (
                                <Link to={`/proposals/${row.lastProposalId}`} className='members-table__proposal-link'>
                                    #{row.lastProposalId}
                                </Link>
                            ) : (
                                <span className='members-table__muted'>never voted</span>
                            )}
                            <DefaultLink href={buildAccountOperationsLink(row.address)} className='members-table__proposal-link'>
                                ops
                            </DefaultLink>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}