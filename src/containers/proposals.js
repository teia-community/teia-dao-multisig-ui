import React, { useContext, useState } from 'react';
import { Parser, emitMicheline } from '@taquito/michel-codec';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { TOKENS } from '../constants';
import { CopyButton, KindBadge, ProposalIdLink, ProposalSummary, QuorumBar, VoteRow, useIpfsText } from './dashboard-components';
import { MultisigContext } from './context';
import { DefaultLink, TezosAddressLink, TokenLink } from './links';
import {
    buildBigmapLink,
    buildContractLink,
    buildContractOperationsLink,
    buildIpfsGatewayLink,
    buildOperationLink,
    buildProposalRecords,
    buildProposalStorageLink,
    buildVoteOperationsLink,
    formatMutezAmount,
    formatRelativeTime,
    formatTimestamp,
    IPFS_GATEWAYS,
    PROPOSAL_KIND_METADATA,
    shortenAddress,
} from './utils';


function useProposalData() {
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

    return { ...context, proposalRecords };
}

function ProposalSection({ title, count, note, links, children, className = '', footer }) {
    return (
        <section className={`dashboard-section ${className}`.trim()}>
            <div className='dashboard-section__header'>
                <div className='dashboard-section__heading'>
                    <div className='dashboard-section__title-row'>
                        <h2>{title}</h2>
                        {typeof count === 'number' && <span className='dashboard-section__count mono-text'>{count}</span>}
                    </div>
                </div>
                {(note || (links && links.length > 0)) && (
                    <div className='dashboard-section__header-side'>
                        {note && <span className='dashboard-section__note mono-text'>{note}</span>}
                        {links && links.length > 0 && (
                            <div className='dashboard-section__links'>
                                {links.map(link => (
                                    <DefaultLink key={`${link.label}-${link.href}`} href={link.href} className='dashboard-section__link'>
                                        {link.label}
                                    </DefaultLink>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
            {children}
            {footer}
        </section>
    );
}

function LoadingState() {
    return (
        <section className='dashboard-section'>
            <p>Loading proposals from TzKT...</p>
        </section>
    );
}

function EmptyState({ title, copy, className = '' }) {
    return (
        <div className={`empty-state ${className}`.trim()}>
            <strong>{title}</strong>
            <span>{copy}</span>
        </div>
    );
}

function PageIntro({ activeCount, awaitingCount, userAddress }) {
    return (
        <div className='page-intro'>
            <h1>Multisig proposals</h1>
            <div className='page-intro__meta mono-text'>
                {userAddress ? (
                    <>
                        <span>
                            you are <TezosAddressLink address={userAddress} useAlias shorten />
                        </span>
                        <span className='page-intro__separator'>-</span>
                        <span>{activeCount} open</span>
                        <span className='page-intro__separator'>-</span>
                        <span>{awaitingCount} need your vote</span>
                    </>
                ) : (
                    <span>connect a multisig wallet to personalize the active queue</span>
                )}
            </div>
        </div>
    );
}

// Compact duration like "45m", "23h", "3d" measured from a timestamp to now.
function formatWaitingDuration(timestamp, now = Date.now()) {
    if (!timestamp) {
        return '';
    }

    const diff = Math.max(0, now - Date.parse(timestamp));
    const minute = 60000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diff < hour) {
        return `${Math.max(1, Math.round(diff / minute))}m`;
    }

    if (diff < day) {
        return `${Math.round(diff / hour)}h`;
    }

    return `${Math.round(diff / day)}d`;
}

function StatusStrip({ contractAddress, storage, proposalRecords, awaitingCount }) {
    const openProposals = proposalRecords.filter(proposalRecord => proposalRecord.status === 'open');
    const activeCount = openProposals.length;
    const readyCount = proposalRecords.filter(proposalRecord => proposalRecord.canExecute).length;
    const oldestOpen = openProposals.reduce(
        (oldest, proposalRecord) => (!oldest || Date.parse(proposalRecord.createdAt) < Date.parse(oldest.createdAt) ? proposalRecord : oldest),
        undefined);
    const oldestWaiting = oldestOpen ? formatWaitingDuration(oldestOpen.createdAt) : undefined;

    return (
        <div className='status-line' aria-label='Multisig overview'>
            <p className='status-line__primary mono-text'>
                <span className='status-line__caret'>{'▶'}</span>
                <span className={`status-line__stat${awaitingCount > 0 ? ' is-attention' : ' is-muted'}`}>
                    {awaitingCount} awaiting your vote
                </span>
                <span className='status-line__sep'>·</span>
                <span className={`status-line__stat${readyCount > 0 ? ' is-ready' : ' is-muted'}`}>
                    {readyCount} ready to execute
                </span>
                <span className='status-line__sep'>·</span>
                <span className='status-line__stat'>{activeCount} active</span>
                {oldestWaiting && (
                    <>
                        <span className='status-line__sep'>·</span>
                        <span className='status-line__stat is-muted'>oldest waiting {oldestWaiting}</span>
                    </>
                )}
            </p>
            <p className='status-line__identity mono-text'>
                <DefaultLink href={buildContractLink(contractAddress)} className='status-line__contract'>
                    {shortenAddress(contractAddress, 6, 5)}
                </DefaultLink>
                <span className='status-line__sep'>·</span>
                <span>mainnet</span>
                <span className='status-line__sep'>·</span>
                <span>{storage?.users?.length || 0} members</span>
                <span className='status-line__sep'>·</span>
                <span>quorum {storage?.minimum_votes || 0}</span>
            </p>
        </div>
    );
}

function ProposalRow({ contractAddress, isUser, minimumVotes, proposalRecord, onExecute, onVote }) {
    const navigate = useNavigate();
    const handleOpen = () => navigate(`/proposals/${proposalRecord.id}`);

    return (
        <div
            className={`proposal-row${proposalRecord.status !== 'open' ? ' is-history' : ''}${proposalRecord.status === 'open' && proposalRecord.userVote !== undefined ? ' is-muted' : ''}`}
            role='button'
            tabIndex={0}
            aria-label={`Open proposal ${proposalRecord.id}`}
            onClick={event => {
                if (event.target.closest('a,button')) {
                    return;
                }

                handleOpen();
            }}
            onKeyDown={event => {
                if (event.target !== event.currentTarget) {
                    return;
                }

                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleOpen();
                }
            }}>
            <div className='proposal-row__timestamp mono-text'>{formatTimestamp(proposalRecord.createdAt)}</div>
            <div className='proposal-row__identity'>
                <ProposalIdLink proposalId={proposalRecord.id} contractAddress={contractAddress} />
                <KindBadge kind={proposalRecord.kind} />
            </div>
            <div className='proposal-row__body'>
                <div className='proposal-row__summary'>
                    <span onClick={event => event.stopPropagation()}>
                        <TezosAddressLink address={proposalRecord.proposal.issuer} useAlias shorten />
                    </span>
                    <span className='proposal-row__summary-separator'>-</span>
                    <ProposalSummary proposalRecord={proposalRecord} />
                </div>
                <div className='proposal-row__meta'>
                    {proposalRecord.status === 'open' ? (
                        <>
                            <QuorumBar
                                yesCount={proposalRecord.yesVoters.length}
                                noCount={proposalRecord.noVoters.length}
                                pendingCount={proposalRecord.pendingVoters.length}
                                threshold={minimumVotes}
                            />
                            <span className='proposal-row__status-copy'>expires {formatRelativeTime(proposalRecord.expiresAt)}</span>
                        </>
                    ) : (
                        <ExecutedSummary proposalRecord={proposalRecord} />
                    )}
                </div>
            </div>
            <div className='proposal-row__actions'>
                {proposalRecord.status === 'open' && proposalRecord.canExecute && isUser && (
                    <button onClick={() => onExecute(proposalRecord.id)}>execute</button>
                )}

                {proposalRecord.status === 'open' && isUser && proposalRecord.userVote === undefined && (
                    <>
                        <button onClick={() => onVote(proposalRecord.id, true)}>YES</button>
                        <button onClick={() => onVote(proposalRecord.id, false)}>NO</button>
                    </>
                )}

                {proposalRecord.status === 'open' && proposalRecord.userVote !== undefined && (
                    <span className={`proposal-row__vote-state${proposalRecord.userVote ? ' is-yes' : ' is-no'}`}>
                        you voted {proposalRecord.userVote ? 'YES' : 'NO'}
                    </span>
                )}

                {proposalRecord.status === 'executed' && proposalRecord.executeOperation && (
                    <DefaultLink href={buildOperationLink(proposalRecord.executeOperation.hash)} className='proposal-row__history-link'>
                        executed {formatRelativeTime(proposalRecord.executedAt)}
                    </DefaultLink>
                )}

                {proposalRecord.status === 'expired' && (
                    <span className='proposal-row__history-link'>expired {formatRelativeTime(proposalRecord.expiresAt)}</span>
                )}
            </div>
        </div>
    );
}

function ExecutedSummary({ proposalRecord }) {
    return (
        <div className='history-summary'>
            <span className='history-summary__yes'>{proposalRecord.yesVoters.length} yes</span>
            <span className='history-summary__no'>{proposalRecord.noVoters.length} no</span>
            <span className='history-summary__pending'>{proposalRecord.pendingVoters.length} abstain</span>
            {proposalRecord.userVote !== undefined && (
                <span className={`history-summary__vote${proposalRecord.userVote ? ' is-yes' : ' is-no'}`}>
                    you: {proposalRecord.userVote ? 'YES' : 'NO'}
                </span>
            )}
        </div>
    );
}

function AwaitingYouSection({ contractAddress, isUser, minimumVotes, proposals, onExecute, onVote, userAddress }) {
    if (!userAddress) {
        return (
            <ProposalSection title='Awaiting your vote' count={0} note='sync a multisig wallet to personalize this queue' className='awaiting-section'>
                <EmptyState title='Wallet not connected' copy='Sync the wallet used for multisig voting to see the proposals that still need you.' />
            </ProposalSection>
        );
    }

    if (!isUser) {
        return null;
    }

    return (
        <ProposalSection
            title='Awaiting your vote'
            count={proposals.length}
            note='click any row to read the proposal and verify on-chain'
            className='awaiting-section'>
            {proposals.length === 0 ? (
                <EmptyState title='All caught up' copy='You have already handled every currently open proposal.' className='empty-state--success' />
            ) : (
                <div className='proposal-table'>
                    {proposals.map(proposalRecord => (
                        <ProposalRow
                            key={proposalRecord.id}
                            contractAddress={contractAddress}
                            isUser={isUser}
                            minimumVotes={minimumVotes}
                            proposalRecord={proposalRecord}
                            onExecute={onExecute}
                            onVote={onVote}
                        />
                    ))}
                </div>
            )}
        </ProposalSection>
    );
}

export function Proposals() {
    const { contractAddress, executeProposal, proposalRecords, proposalOperations, proposals, storage, userAddress, voteOperations, voteProposal, voteRecords } = useProposalData();
    const [showAllExecuted, setShowAllExecuted] = useState(false);

    if (!(storage && proposals && voteRecords && proposalOperations && voteOperations)) {
        return <LoadingState />;
    }

    const isUser = storage.users.includes(userAddress);
    const minimumVotes = Number(storage.minimum_votes || 0);
    const openProposals = proposalRecords.filter(proposalRecord => proposalRecord.status === 'open');
    const awaitingProposals = proposalRecords.filter(proposalRecord => proposalRecord.isAwaitingUser);
    const activeProposals = isUser
        ? openProposals.filter(proposalRecord => !proposalRecord.isAwaitingUser)
        : openProposals;
    const executedProposals = proposalRecords.filter(proposalRecord => proposalRecord.status === 'executed');
    const expiredProposals = proposalRecords.filter(proposalRecord => proposalRecord.status === 'expired');
    const visibleExecutedProposals = showAllExecuted ? executedProposals : executedProposals.slice(0, 5);
    const activeSectionNote = isUser
        ? 'open proposals that no longer need your vote'
        : `quorum ${minimumVotes} of ${storage.users.length}`;
    const activeEmptyCopy = isUser && awaitingProposals.length > 0
        ? 'Every open proposal that still needs your attention is already in the queue above.'
        : 'There are no other open proposals right now.';

    return (
        <>
            <StatusStrip
                contractAddress={contractAddress}
                storage={storage}
                proposalRecords={proposalRecords}
                awaitingCount={awaitingProposals.length}
            />

            <PageIntro activeCount={openProposals.length} awaitingCount={awaitingProposals.length} userAddress={userAddress} />

            <AwaitingYouSection
                contractAddress={contractAddress}
                isUser={isUser}
                minimumVotes={minimumVotes}
                proposals={awaitingProposals}
                onExecute={executeProposal}
                onVote={voteProposal}
                userAddress={userAddress}
            />

            <ProposalSection title='Active proposals' count={activeProposals.length} note={activeSectionNote}>
                {activeProposals.length === 0 ? (
                    <EmptyState title='No other active proposals' copy={activeEmptyCopy} />
                ) : (
                    <div className='proposal-table'>
                        {activeProposals.map(proposalRecord => (
                            <ProposalRow
                                key={proposalRecord.id}
                                contractAddress={contractAddress}
                                isUser={isUser}
                                minimumVotes={minimumVotes}
                                proposalRecord={proposalRecord}
                                onExecute={executeProposal}
                                onVote={voteProposal}
                            />
                        ))}
                    </div>
                )}
            </ProposalSection>

            <ProposalSection
                title='Executed proposals'
                count={executedProposals.length}
                links={[{ label: 'full history on TzKT', href: buildContractOperationsLink(contractAddress) }]}>
                {executedProposals.length === 0 ? (
                    <EmptyState title='Nothing executed yet' copy='Executed proposals will appear here with their final vote breakdowns and execution operations.' />
                ) : (
                    <>
                        <div className='proposal-table'>
                            {visibleExecutedProposals.map(proposalRecord => (
                                <ProposalRow
                                    key={proposalRecord.id}
                                    contractAddress={contractAddress}
                                    isUser={false}
                                    minimumVotes={minimumVotes}
                                    proposalRecord={proposalRecord}
                                    onExecute={executeProposal}
                                    onVote={voteProposal}
                                />
                            ))}
                        </div>
                        {!showAllExecuted && executedProposals.length > visibleExecutedProposals.length && (
                            <div className='proposal-section__footer'>
                                <button onClick={() => setShowAllExecuted(true)}>
                                    show {executedProposals.length - visibleExecutedProposals.length} more
                                </button>
                            </div>
                        )}
                    </>
                )}
            </ProposalSection>

            <ProposalSection title='Expired proposals' count={expiredProposals.length} note='these proposals can no longer be executed or voted on'>
                {expiredProposals.length === 0 ? (
                    <EmptyState title='No expired proposals' copy='Open proposals that miss quorum before expiry will show up here.' />
                ) : (
                    <div className='proposal-table'>
                        {expiredProposals.map(proposalRecord => (
                            <ProposalRow
                                key={proposalRecord.id}
                                contractAddress={contractAddress}
                                isUser={false}
                                minimumVotes={minimumVotes}
                                proposalRecord={proposalRecord}
                                onExecute={executeProposal}
                                onVote={voteProposal}
                            />
                        ))}
                    </div>
                )}
            </ProposalSection>
        </>
    );
}

function IpfsPanel({ cid }) {
    const [showRaw, setShowRaw] = useState(false);
    const { error, gateway, status, text, truncated } = useIpfsText(cid);

    return (
        <div className='detail-card'>
            <div className='detail-card__header'>
                <div className='detail-card__title detail-card__title--inline'>
                    <span className='detail-card__label'>ipfs://</span>
                    <span className='detail-card__cid mono-text'>{cid}</span>
                </div>
                <CopyButton value={cid} text='copy cid' />
            </div>

            <div className='detail-card__subheader'>
                <span>open via</span>
                <div className='detail-card__links'>
                    {IPFS_GATEWAYS.map(currentGateway => (
                        <DefaultLink key={currentGateway} href={buildIpfsGatewayLink(cid, currentGateway)} className={`detail-card__link${gateway === currentGateway ? ' is-active' : ''}`}>
                            {currentGateway}
                        </DefaultLink>
                    ))}
                </div>
            </div>

            {status === 'loading' && <p className='detail-card__message'>Fetching text from public gateways...</p>}

            {status === 'error' && (
                <div className='detail-card__message detail-card__message--error'>
                    <p>Public gateways did not return readable text in time.</p>
                    <span>{error}</span>
                </div>
            )}

            {status === 'ok' && (
                <>
                    <div className='detail-card__subheader'>
                        <span>{gateway ? `fetched from ${gateway}` : 'gateway race complete'}</span>
                        {truncated && <span>truncated at 100KB</span>}
                        <div className='detail-card__header-actions'>
                            <button className={`inline-button${showRaw ? '' : ' is-active'}`} onClick={() => setShowRaw(false)}>text</button>
                            <button className={`inline-button${showRaw ? ' is-active' : ''}`} onClick={() => setShowRaw(true)}>raw</button>
                        </div>
                    </div>
                    <pre className='detail-card__content'>{showRaw ? text : text.trim()}</pre>
                </>
            )}
        </div>
    );
}

function PayloadCard({ proposalRecord }) {
    const proposal = proposalRecord.proposal;
    const token = proposal.kind.transfer_token ? TOKENS.find(currentToken => currentToken.fa2 === proposal.token_transfers.fa2) : undefined;
    let rows;

    if (proposalRecord.kind === 'transfer_mutez') {
        rows = proposal.mutez_transfers.map((transfer, index) => ({
            label: proposal.mutez_transfers.length > 1 ? `transfer ${index + 1}` : 'transfer',
            value: (
                <>
                    <span className='mono-text'>{formatMutezAmount(transfer.amount)} XTZ</span>
                    {' to '}
                    <TezosAddressLink address={transfer.destination} useAlias shorten />
                </>
            )
        }));
    } else if (proposalRecord.kind === 'transfer_token') {
        rows = [
            { label: 'token contract', value: <TokenLink fa2={proposal.token_transfers.fa2} id={proposal.token_transfers.token_id}>{token?.name || proposal.token_transfers.fa2}</TokenLink> },
            { label: 'token id', value: <span className='mono-text'>{proposal.token_transfers.token_id}</span> },
            {
                label: 'distribution',
                value: (
                    <div className='payload-list'>
                        {proposal.token_transfers.distribution.map((transfer, index) => (
                            <span key={`${transfer.destination}-${index}`}>
                                <span className='mono-text'>{Number(transfer.amount).toLocaleString('en-US')}</span>
                                {' to '}
                                <TezosAddressLink address={transfer.destination} useAlias shorten />
                            </span>
                        ))}
                    </div>
                )
            }
        ];
    } else if (proposalRecord.kind === 'add_user' || proposalRecord.kind === 'remove_user') {
        rows = [{ label: 'member', value: <TezosAddressLink address={proposal.user} useAlias shorten /> }];
    } else if (proposalRecord.kind === 'minimum_votes') {
        rows = [{ label: 'new threshold', value: <span className='mono-text'>{proposal.minimum_votes}</span> }];
    } else if (proposalRecord.kind === 'expiration_time') {
        rows = [{ label: 'new expiration', value: <span className='mono-text'>{proposal.expiration_time} days</span> }];
    } else {
        let micheline = 'No lambda payload available.';

        try {
            const parser = new Parser();
            const lambdaFunction = typeof proposal.lambda_function === 'string'
                ? JSON.parse(proposal.lambda_function)
                : proposal.lambda_function;
            const michelineJson = parser.parseJSON(lambdaFunction);
            micheline = emitMicheline(michelineJson, { indent: '    ', newline: '\n' });
        } catch (error) {
            micheline = JSON.stringify(proposal.lambda_function, null, 2) || micheline;
        }

        rows = [{ label: 'lambda', value: <pre className='micheline-code'>{micheline}</pre> }];
    }

    return (
        <div className='detail-card'>
            <div className='detail-card__header'>
                <div className='detail-card__title'>
                    <span className='detail-card__label'>Payload</span>
                    <span>{PROPOSAL_KIND_METADATA[proposalRecord.kind]?.label || proposalRecord.kind}</span>
                </div>
                <span className='detail-card__variant mono-text'>{proposalRecord.variantTag}</span>
            </div>
            <div className='payload-grid'>
                {rows.map(row => (
                    <React.Fragment key={row.label}>
                        <span className='payload-grid__label'>{row.label}</span>
                        <div className='payload-grid__value'>{row.value}</div>
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}

function YourVoteCard({ isUser, proposalRecord, userAddress, onExecute, onVote }) {
    const voteOperation = userAddress ? proposalRecord.voteOperations[userAddress] : undefined;
    const hasUserVote = proposalRecord.userVote !== undefined;
    const voteLabel = proposalRecord.userVote ? 'YES' : 'NO';

    return (
        <div className='detail-card'>
            <div className='detail-card__header'>
                <div className='detail-card__title'>
                    <span className='detail-card__label'>Your vote</span>
                    {hasUserVote ? (
                        <span className={`proposal-row__vote-state${proposalRecord.userVote ? ' is-yes' : ' is-no'}`}>
                            {voteLabel}
                        </span>
                    ) : (
                        <span className='proposal-row__status-copy'>not cast yet</span>
                    )}
                </div>
            </div>

            {hasUserVote && (
                <div className='detail-card__subheader'>
                    <span>you voted {voteLabel}</span>
                    {voteOperation && (
                        <DefaultLink href={buildOperationLink(voteOperation.hash)} className='detail-card__link'>
                            tx {shortenAddress(voteOperation.hash, 4, 4)}
                        </DefaultLink>
                    )}
                </div>
            )}

            {proposalRecord.status !== 'open' && <p className='detail-card__message'>Voting is closed for this proposal.</p>}

            {proposalRecord.status === 'open' && !userAddress && <p className='detail-card__message'>Connect a wallet to vote or execute.</p>}

            {proposalRecord.status === 'open' && userAddress && !isUser && <p className='detail-card__message'>The connected wallet is not currently a multisig member.</p>}

            {proposalRecord.status === 'open' && isUser && (
                <div className='detail-card__button-row'>
                    {hasUserVote ? (
                        <button onClick={() => onVote(proposalRecord.id, !proposalRecord.userVote)}>
                            change to {proposalRecord.userVote ? 'NO' : 'YES'}
                        </button>
                    ) : (
                        <>
                            <button onClick={() => onVote(proposalRecord.id, true)}>vote YES</button>
                            <button onClick={() => onVote(proposalRecord.id, false)}>vote NO</button>
                        </>
                    )}
                    {proposalRecord.canExecute && <button onClick={() => onExecute(proposalRecord.id)}>execute</button>}
                </div>
            )}
        </div>
    );
}

function VoteBreakdown({ proposalRecord }) {
    const groups = [
        { label: 'YES', vote: 'yes', addresses: [...proposalRecord.yesVoters].sort() },
        { label: 'NO', vote: 'no', addresses: [...proposalRecord.noVoters].sort() },
        { label: proposalRecord.status === 'open' ? 'NOT VOTED YET' : 'DID NOT VOTE', addresses: [...proposalRecord.pendingVoters].sort() },
    ];

    return (
        <div className='detail-card'>
            <div className='detail-card__header'>
                <div className='detail-card__title'>
                    <span className='detail-card__label'>Voters</span>
                    <span>{proposalRecord.yesVoters.length + proposalRecord.noVoters.length} recorded votes</span>
                </div>
            </div>
            <div className='vote-groups'>
                {groups.map(group => (
                    <div key={group.label} className='vote-group'>
                        <div className='vote-group__header'>
                            <span>{group.label}</span>
                            <span>{group.addresses.length}</span>
                        </div>
                        {group.addresses.length === 0 ? (
                            <span className='detail-card__message'>None</span>
                        ) : (
                            <div className='vote-group__items'>
                                {group.addresses.map(address => (
                                    <VoteRow
                                        key={`${group.label}-${address}`}
                                        address={address}
                                        operation={proposalRecord.voteOperations[address]}
                                        vote={group.vote}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function ProvenanceCard({ contractAddress, proposalRecord, storage }) {
    return (
        <div className='detail-card'>
            <div className='detail-card__header'>
                <div className='detail-card__title'>
                    <span className='detail-card__label'>Provenance</span>
                    <span>chain references</span>
                </div>
            </div>
            <div className='detail-card__stack'>
                <div>
                    proposed by <TezosAddressLink address={proposalRecord.proposal.issuer} useAlias shorten />
                </div>
                <DefaultLink href={buildProposalStorageLink(proposalRecord.id, contractAddress)} className='detail-card__link'>
                    proposal #{proposalRecord.id} on TzKT
                </DefaultLink>
                <DefaultLink href={buildVoteOperationsLink(contractAddress)} className='detail-card__link'>
                    vote operations on TzKT
                </DefaultLink>
                {proposalRecord.proposalOperation && (
                    <DefaultLink href={buildOperationLink(proposalRecord.proposalOperation.hash)} className='detail-card__link'>
                        creation op {proposalRecord.proposalOperation.hash}
                    </DefaultLink>
                )}
                {proposalRecord.executeOperation && (
                    <DefaultLink href={buildOperationLink(proposalRecord.executeOperation.hash)} className='detail-card__link'>
                        execute op {proposalRecord.executeOperation.hash}
                    </DefaultLink>
                )}
                <DefaultLink href={buildBigmapLink(storage.proposals, contractAddress)} className='detail-card__link'>
                    proposals bigmap {storage.proposals}
                </DefaultLink>
                <DefaultLink href={buildBigmapLink(storage.votes, contractAddress)} className='detail-card__link'>
                    votes bigmap {storage.votes}
                </DefaultLink>
                {proposalRecord.kind === 'text' && proposalRecord.ipfsCid && (
                    <DefaultLink href={buildIpfsGatewayLink(proposalRecord.ipfsCid, IPFS_GATEWAYS[0])} className='detail-card__link'>
                        ipfs gateway
                    </DefaultLink>
                )}
            </div>
        </div>
    );
}

function ProposalHeader({ minimumVotes, proposalRecord }) {
    return (
        <div className='detail-header'>
            <div className='detail-header__crumbs'>
                <Link to='/proposals'>Proposals</Link>
                <span>/</span>
                <span className='mono-text'>#{proposalRecord.id}</span>
            </div>
            <h1 className='detail-header__title'>
                <TezosAddressLink address={proposalRecord.proposal.issuer} useAlias shorten />
                {' proposed '}
                <span className='detail-header__summary'>
                    <ProposalSummary proposalRecord={proposalRecord} />
                </span>
            </h1>
            <div className='detail-header__meta'>
                <span>created {formatTimestamp(proposalRecord.createdAt)}</span>
                <span>
                    {proposalRecord.status === 'executed'
                        ? `executed ${formatRelativeTime(proposalRecord.executedAt)}`
                        : proposalRecord.status === 'expired'
                            ? `expired ${formatRelativeTime(proposalRecord.expiresAt)}`
                            : `expires ${formatRelativeTime(proposalRecord.expiresAt)}`}
                </span>
                <span className={`detail-header__status${proposalRecord.canExecute ? ' is-ready' : ''}`}>
                    quorum {proposalRecord.yesVoters.length}/{minimumVotes}
                </span>
                {proposalRecord.userVote !== undefined && <span>you voted {proposalRecord.userVote ? 'YES' : 'NO'}</span>}
                {proposalRecord.status === 'open' && proposalRecord.canExecute && <span className='detail-header__status is-ready'>threshold met · executable now</span>}
            </div>
        </div>
    );
}

export function ProposalDetails() {
    const params = useParams();
    const { contractAddress, executeProposal, proposalRecords, proposals, storage, userAddress, voteOperations, voteProposal, voteRecords } = useProposalData();

    if (!(storage && proposals && voteRecords && voteOperations)) {
        return <LoadingState />;
    }

    const proposalRecord = proposalRecords.find(record => String(record.id) === params.proposalId);

    if (!proposalRecord) {
        return (
            <section className='dashboard-section'>
                <p>Proposal #{params.proposalId} was not found in the current bigmap snapshot.</p>
                <Link to='/proposals'>Back to proposals</Link>
            </section>
        );
    }

    const isUser = storage.users.includes(userAddress);
    const minimumVotes = Number(storage.minimum_votes || 0);

    return (
        <section className='proposal-detail'>
            <ProposalHeader minimumVotes={minimumVotes} proposalRecord={proposalRecord} />

            <div className='proposal-detail__grid'>
                <div className='proposal-detail__main'>
                    {proposalRecord.kind === 'text' ? <IpfsPanel cid={proposalRecord.ipfsCid} /> : <PayloadCard proposalRecord={proposalRecord} />}
                </div>
                <aside className='proposal-detail__sidebar'>
                    <YourVoteCard isUser={isUser} proposalRecord={proposalRecord} userAddress={userAddress} onExecute={executeProposal} onVote={voteProposal} />
                    <VoteBreakdown proposalRecord={proposalRecord} />
                    <ProvenanceCard contractAddress={contractAddress} proposalRecord={proposalRecord} storage={storage} />
                </aside>
            </div>
        </section>
    );
}
