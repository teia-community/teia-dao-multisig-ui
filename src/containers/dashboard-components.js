import React, { useEffect, useState } from 'react';
import { TOKENS } from '../constants';
import { DefaultLink, TezosAddressLink, TokenLink } from './links';
import {
    buildIpfsGatewayLink,
    buildOperationLink,
    buildProposalStorageLink,
    decodeIpfsPath,
    formatMutezAmount,
    getProposalKind,
    IPFS_GATEWAYS,
    PROPOSAL_KIND_METADATA,
} from './utils';


function looksBinary(text) {
    let controls = 0;

    for (const char of text.slice(0, 1000)) {
        const code = char.charCodeAt(0);
        const isControl = (code >= 0 && code <= 8) || code === 11 || code === 12 || (code >= 14 && code <= 31);

        if (isControl) {
            controls += 1;
        }
    }

    return controls > 5;
}

function getProposalTitle(text) {
    const lines = (text || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);

    for (const line of lines) {
        const normalized = line.replace(/^['"#*\-\s]+|['"]+$/g, '').trim();

        if (!normalized) {
            continue;
        }

        if (/^[-_=]{4,}$/.test(normalized)) {
            continue;
        }

        if (/^(about the|budget breakdown|documentation plan|attendance tracking|accessibility plan|applicant|event type)/i.test(normalized)) {
            continue;
        }

        return normalized.slice(0, 120);
    }

    return undefined;
}

export function useIpfsText(cid) {
    const [state, setState] = useState({ status: 'idle', text: undefined, gateway: undefined, truncated: false, error: undefined });

    useEffect(() => {
        if (!cid) {
            setState({ status: 'idle', text: undefined, gateway: undefined, truncated: false, error: undefined });
            return undefined;
        }

        let cancelled = false;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        setState({ status: 'loading', text: undefined, gateway: undefined, truncated: false, error: undefined });

        Promise.any(IPFS_GATEWAYS.slice(0, 3).map(async gateway => {
            const response = await fetch(buildIpfsGatewayLink(cid, gateway), { signal: controller.signal });

            if (!response.ok) {
                throw new Error(`${gateway}: ${response.status}`);
            }

            const buffer = await response.arrayBuffer();
            const truncated = buffer.byteLength > 100000;
            const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer.slice(0, Math.min(buffer.byteLength, 100000)));

            if (looksBinary(text)) {
                throw new Error(`${gateway}: binary content`);
            }

            return { gateway, text, truncated };
        })).then(result => {
            if (!cancelled) {
                setState({ status: 'ok', text: result.text, gateway: result.gateway, truncated: result.truncated, error: undefined });
            }
        }).catch(error => {
            if (!cancelled) {
                setState({ status: 'error', text: undefined, gateway: undefined, truncated: false, error: String(error) });
            }
        }).finally(() => clearTimeout(timeout));

        return () => {
            cancelled = true;
            controller.abort();
            clearTimeout(timeout);
        };
    }, [cid]);

    return state;
}

export function CopyButton({ value, text = 'copy' }) {
    const [copied, setCopied] = useState(false);

    return (
        <button
            className='inline-button'
            onClick={async event => {
                event.stopPropagation();

                try {
                    await navigator.clipboard?.writeText(value);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1200);
                } catch (error) {
                    console.log('Error while copying to clipboard:', error);
                }
            }}>
            {copied ? 'copied' : text}
        </button>
    );
}

export function Avatar({ address, size = '2.1rem' }) {
    let hue = 0;

    for (let index = 0; index < address.length; index += 1) {
        hue = (hue * 31 + address.charCodeAt(index)) % 360;
    }

    return (
        <span
            className='member-avatar'
            style={{ '--avatar-hue': `${hue}deg`, '--avatar-size': size }}
            title={address}>
            {address.slice(2, 4).toUpperCase()}
        </span>
    );
}

export function KindBadge({ kind }) {
    const metadata = PROPOSAL_KIND_METADATA[kind];

    if (!metadata) {
        return null;
    }

    return (
        <span className={`kind-badge kind-badge--${kind.replace('_', '-')}`} title={metadata.label}>
            {metadata.short}
        </span>
    );
}

export function QuorumBar({ yesCount, noCount, pendingCount, threshold }) {
    const safeThreshold = Math.max(threshold, 1);
    const yesWidth = Math.min(yesCount, safeThreshold) / safeThreshold * 100;
    const noWidth = Math.min(noCount, Math.max(0, safeThreshold - Math.min(yesCount, safeThreshold))) / safeThreshold * 100;
    const ready = yesCount >= safeThreshold;

    return (
        <div className='quorum-bar'>
            <div className='quorum-bar__track'>
                <span className={`quorum-bar__yes${ready ? ' is-ready' : ''}`} style={{ width: `${yesWidth}%` }} />
                {noWidth > 0 && <span className='quorum-bar__no' style={{ width: `${noWidth}%`, left: `${yesWidth}%` }} />}
            </div>
            <span className={`quorum-bar__summary${ready ? ' is-ready' : ''}`}>
                {yesCount}/{safeThreshold} yes
            </span>
            {noCount > 0 && <span className='quorum-bar__no-count'>{noCount} no</span>}
            <span className='quorum-bar__pending'>{pendingCount} pending</span>
        </div>
    );
}

export function ProposalIdLink({ proposalId, contractAddress }) {
    return (
        <DefaultLink href={buildProposalStorageLink(proposalId, contractAddress)} className='proposal-id-link'>
            #{proposalId}
        </DefaultLink>
    );
}

export function VotePill({ address, operation, vote }) {
    return (
        <span className={`vote-pill${vote ? ` vote-pill--${vote}` : ''}`}>
            <TezosAddressLink address={address} useAlias shorten />
            {operation && (
                <DefaultLink href={buildOperationLink(operation.hash)} className='vote-pill__op'>
                    op
                </DefaultLink>
            )}
        </span>
    );
}
export function VoteRow({ address, operation, vote }) {
    return (
        <div className={`vote-row${vote ? ` vote-row--${vote}` : ''}`}>
            <TezosAddressLink address={address} useAlias shorten />
            {operation && (
                <DefaultLink href={buildOperationLink(operation.hash)} className='vote-row__op'>
                    view operation
                </DefaultLink>
            )}
        </div>
    );
}

export function ProposalSummary({ proposalRecord }) {
    const proposal = proposalRecord.proposal || proposalRecord.value || proposalRecord;
    const kind = proposalRecord.kind || getProposalKind(proposalRecord);
    const cid = kind === 'text' ? (proposalRecord.ipfsCid || decodeIpfsPath(proposal.text)) : undefined;
    const { text } = useIpfsText(cid);

    if (kind === 'text') {
        const title = proposalRecord.title?.trim() || getProposalTitle(text);

        return (
            <span>
                {title || 'text proposal'}
                {!title && <span className='proposal-summary__fallback-note'> (no title in payload)</span>}
            </span>
        );
    }

    if (kind === 'transfer_mutez') {
        const transfers = proposal.mutez_transfers || [];
        const total = transfers.reduce((sum, transfer) => sum + Number(transfer.amount || 0), 0);

        if (transfers.length === 1) {
            return (
                <span>
                    transfer <span className='mono-text'>{formatMutezAmount(transfers[0].amount)} XTZ</span> to <TezosAddressLink address={transfers[0].destination} useAlias shorten />
                </span>
            );
        }

        return (
            <span>
                transfer <span className='mono-text'>{formatMutezAmount(total)} XTZ</span> across {transfers.length} destinations
            </span>
        );
    }

    if (kind === 'transfer_token') {
        const tokenTransfers = proposal.token_transfers;
        const token = TOKENS.find(currentToken => currentToken.fa2 === tokenTransfers.fa2);
        const total = tokenTransfers.distribution.reduce((sum, transfer) => sum + Number(transfer.amount || 0), 0);
        const label = token ? (token.multiasset ? `token #${tokenTransfers.token_id}` : token.name) : tokenTransfers.fa2;

        return (
            <span>
                transfer <span className='mono-text'>{total.toLocaleString('en-US')}</span> to {tokenTransfers.distribution.length} destination{tokenTransfers.distribution.length === 1 ? '' : 's'} from <TokenLink fa2={tokenTransfers.fa2} id={tokenTransfers.token_id}>{label}</TokenLink>
            </span>
        );
    }

    if (kind === 'add_user') {
        return (
            <span>
                add <TezosAddressLink address={proposal.user} useAlias shorten /> to the multisig
            </span>
        );
    }

    if (kind === 'remove_user') {
        return (
            <span>
                remove <TezosAddressLink address={proposal.user} useAlias shorten /> from the multisig
            </span>
        );
    }

    if (kind === 'minimum_votes') {
        return <span>change the minimum positive votes to <span className='mono-text'>{proposal.minimum_votes}</span></span>;
    }

    if (kind === 'expiration_time') {
        return <span>change the expiration time to <span className='mono-text'>{proposal.expiration_time}</span> days</span>;
    }

    return <span>execute a lambda function</span>;
}