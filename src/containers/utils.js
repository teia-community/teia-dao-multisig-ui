import axios from 'axios';
import { CONTRACT_ADDRESS, NETWORK, IPFS_UPLOAD_PROXY } from '../constants';


export const IPFS_GATEWAYS = ['ipfs.io', 'dweb.link', 'w3s.link'];

export const PROPOSAL_ENTRYPOINTS = {
    add_user: 'add_user_proposal',
    expiration_time: 'expiration_time_proposal',
    lambda_function: 'lambda_function_proposal',
    minimum_votes: 'minimum_votes_proposal',
    remove_user: 'remove_user_proposal',
    text: 'text_proposal',
    transfer_mutez: 'transfer_mutez_proposal',
    transfer_token: 'transfer_token_proposal'
};

// SmartPy variants are laid out alphabetically in the compiled Michelson tree.
// The tags below are verified against raw TzKT Micheline for live proposals.
export const PROPOSAL_VARIANT_TAGS = {
    add_user: 'Left(Left(Left(Unit)))',
    expiration_time: 'Left(Left(Right(Unit)))',
    lambda_function: 'Left(Right(Left(Unit)))',
    minimum_votes: 'Left(Right(Right(Unit)))',
    remove_user: 'Right(Left(Left(Unit)))',
    text: 'Right(Left(Right(Unit)))',
    transfer_mutez: 'Right(Right(Left(Unit)))',
    transfer_token: 'Right(Right(Right(Unit)))'
};

export const PROPOSAL_KIND_METADATA = {
    add_user: { short: '+MEM', label: 'add member' },
    expiration_time: { short: 'TIME', label: 'change expiration' },
    lambda_function: { short: 'LAMB', label: 'lambda function' },
    minimum_votes: { short: 'THRS', label: 'change minimum votes' },
    remove_user: { short: '-MEM', label: 'remove member' },
    text: { short: 'TEXT', label: 'text proposal' },
    transfer_mutez: { short: 'XTZ', label: 'transfer mutez' },
    transfer_token: { short: 'FA2', label: 'transfer token' }
};


// Returns the user address
export async function getUserAddress(wallet) {
    const activeAccount = await wallet.client.getActiveAccount()
        .catch(error => console.log('Error while accessing the active account:', error));

    return activeAccount?.address;
}

// Returns the contract reference
export async function getContract(tezos, contractAddress) {
    return await tezos.wallet.at(contractAddress)
        .catch(error => console.log('Error while accessing the contract:', error));
}

// Returns the contract storage
export async function getContractStorage(contractAddress, network = NETWORK) {
    const response = await axios.get(`https://api.${network}.tzkt.io/v1/contracts/${contractAddress}/storage`)
        .catch(error => console.log('Error while querying the contract storage:', error));

    return response?.data;
}

// Returns the account balance in mutez
export async function getBalance(account, network = NETWORK) {
    const response = await axios.get(`https://api.${network}.tzkt.io/v1/accounts/${account}/balance`)
        .catch(error => console.log('Error while querying the account balance:', error));

    return response?.data;
}

// Returns some bigmap keys
export async function getBigmapKeys(bigmap, extraParameters = {}, network = NETWORK) {
    const parameters = Object.assign(
        {
            limit: 10000,
            select: 'key,value',
        },
        extraParameters);
    const response = await axios.get(`https://api.${network}.tzkt.io/v1/bigmaps/${bigmap}/keys`, { params: parameters })
        .catch(error => console.log('Error while querying the bigmap keys:', error));

    return response?.data.reverse();
}

// Returns the full vote records from the multisig votes bigmap.
export async function getVoteRecords(tokenVotesBigmap, network = NETWORK) {
    return await getBigmapKeys(tokenVotesBigmap, {}, network);
}

// Returns the contract storage history from TzKT.
export async function getStorageHistory(contractAddress, network = NETWORK) {
    const response = await axios.get(`https://api.${network}.tzkt.io/v1/contracts/${contractAddress}/storage/history`, {
        params: { limit: 10000 }
    }).catch(error => console.log('Error while querying the contract storage history:', error));

    return response?.data;
}

// Returns contract transactions matching the provided TzKT filters.
export async function getContractTransactions(contractAddress, extraParameters = {}, network = NETWORK) {
    const parameters = Object.assign(
        {
            limit: 10000,
            status: 'applied',
            target: contractAddress,
        },
        extraParameters);
    const response = await axios.get(`https://api.${network}.tzkt.io/v1/operations/transactions`, {
        params: parameters
    }).catch(error => console.log('Error while querying contract transactions:', error));

    return response?.data;
}

// Returns proposal-creation operations for the multisig contract.
export async function getProposalOperations(contractAddress = CONTRACT_ADDRESS, network = NETWORK) {
    return await getContractTransactions(contractAddress, {
        'entrypoint.in': Object.values(PROPOSAL_ENTRYPOINTS).join(',')
    }, network);
}

// Returns vote_proposal operations for the multisig contract.
export async function getVoteOperations(contractAddress = CONTRACT_ADDRESS, network = NETWORK) {
    return await getContractTransactions(contractAddress, {
        entrypoint: 'vote_proposal',
        'sort.desc': 'level'
    }, network);
}

// Returns execute_proposal operations for the multisig contract.
export async function getExecuteOperations(contractAddress = CONTRACT_ADDRESS, network = NETWORK) {
    return await getContractTransactions(contractAddress, {
        entrypoint: 'execute_proposal',
        'sort.desc': 'level'
    }, network);
}

// Returns the user votes
export async function getUserVotes(userAddress, tokenVotesBigmap, network = NETWORK) {
    // Download the user votes from the token votes bigmap
    const extraParameters = { 'key.address': userAddress };
    const votes = await getBigmapKeys(tokenVotesBigmap, extraParameters, network);

    // Rearange the user votes information in a dictionary
    const userVotes = votes ? {} : undefined;
    votes?.forEach(vote => userVotes[vote.key.nat] = vote.value);

    return userVotes;
}

// Returns the H=N user aliases
export async function getUserAliases(users) {
    if (!users?.length) {
        return undefined;
    }

    // Prepare the list of user addresses for the query
    const uniqueUsers = Array.from(new Set(users));
    let userAddresses = uniqueUsers.join(',');

    // The list needs at least two wallets
    if (uniqueUsers.length === 1) {
        userAddresses += ',' + userAddresses;
    }

    // Get the user aliases from the H=N registries bigmap
    const extraParameters = { 'key.in': userAddresses };
    const aliases = await getBigmapKeys('3919', extraParameters, 'mainnet');

    // Rearange the user aliases information in a dictionary
    const userAliases = aliases ? {} : undefined;
    aliases?.forEach(alias => userAliases[alias.key] = hexToString(alias.value));

    return userAliases;
}

// Returns the proposal kind name from a raw proposal record.
export function getProposalKind(proposal) {
    const kind = proposal?.value?.kind || proposal?.kind;

    if (!kind) {
        return undefined;
    }

    return Object.keys(kind)[0];
}

// Returns the proposal-creation entrypoint for a proposal kind.
export function getProposalEntrypoint(kind) {
    return PROPOSAL_ENTRYPOINTS[kind];
}

// Builds the relevant TzKT links for trust-minimized UI affordances.
export function getTzktBaseUrl(network = NETWORK) {
    return network === 'mainnet' ? 'https://tzkt.io' : `https://${network}.tzkt.io`;
}

export function buildContractLink(contractAddress = CONTRACT_ADDRESS, network = NETWORK) {
    return `${getTzktBaseUrl(network)}/${contractAddress}`;
}

export function buildContractStorageLink(contractAddress = CONTRACT_ADDRESS, network = NETWORK) {
    return `${buildContractLink(contractAddress, network)}/storage`;
}

export function buildBigmapLink(bigmapId, contractAddress = CONTRACT_ADDRESS, network = NETWORK) {
    return `${buildContractStorageLink(contractAddress, network)}/?bigmaps=${bigmapId}`;
}

export function buildProposalStorageLink(proposalId, contractAddress = CONTRACT_ADDRESS, network = NETWORK) {
    return `${buildContractStorageLink(contractAddress, network)}/?path=proposals.${proposalId}`;
}

export function buildAccountLink(address, network = NETWORK) {
    return `${getTzktBaseUrl(network)}/${address}`;
}

export function buildAccountOperationsLink(address, network = NETWORK) {
    return `${buildAccountLink(address, network)}/operations`;
}

export function buildOperationLink(hash, network = NETWORK) {
    return `${getTzktBaseUrl(network)}/${hash}`;
}

export function buildContractOperationsLink(contractAddress = CONTRACT_ADDRESS, network = NETWORK) {
    return `${buildContractLink(contractAddress, network)}/operations`;
}

export function buildVoteOperationsLink(contractAddress = CONTRACT_ADDRESS, network = NETWORK) {
    return `${buildContractOperationsLink(contractAddress, network)}?entrypoint=vote_proposal`;
}

export function buildIpfsGatewayLink(cid, gateway) {
    return `https://${gateway}/ipfs/${cid}`;
}

// Returns a shortened Tezos address.
export function shortenAddress(address, left = 6, right = 4) {
    if (!address) {
        return '';
    }

    if (address.length <= left + right + 1) {
        return address;
    }

    return `${address.slice(0, left)}...${address.slice(-right)}`;
}

// Formats a mutez amount as tez.
export function formatMutezAmount(mutez) {
    const tez = Number(mutez || 0) / 1000000;

    return tez.toLocaleString('en-US', {
        maximumFractionDigits: tez >= 1 ? 2 : 6
    });
}

// Formats a timestamp consistently in UTC.
export function formatTimestamp(timestamp) {
    if (!timestamp) {
        return '';
    }

    return new Date(timestamp).toISOString().slice(0, 19) + 'Z';
}

// Formats a relative time from now.
export function formatRelativeTime(timestamp, now = Date.now()) {
    if (!timestamp) {
        return '';
    }

    const diffMs = Date.parse(timestamp) - now;
    const absMs = Math.abs(diffMs);
    const minute = 60000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const month = 30 * day;
    const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

    if (absMs < hour) {
        return formatter.format(Math.round(diffMs / minute), 'minute');
    }

    if (absMs < day) {
        return formatter.format(Math.round(diffMs / hour), 'hour');
    }

    if (absMs < month) {
        return formatter.format(Math.round(diffMs / day), 'day');
    }

    return formatter.format(Math.round(diffMs / month), 'month');
}

// Adds a number of whole days to a timestamp.
export function addDays(timestamp, days) {
    const date = new Date(timestamp);
    date.setUTCDate(date.getUTCDate() + Number(days || 0));

    return date.toISOString();
}

// Returns the proposal expiry timestamp.
export function getProposalExpiryTimestamp(proposal, expirationTime) {
    return addDays(proposal.timestamp, expirationTime);
}

// Returns the proposal status as open, expired, or executed.
export function getProposalStatus(proposal, expirationTime, now = Date.now()) {
    if (proposal.executed) {
        return 'executed';
    }

    const expiresAt = Date.parse(getProposalExpiryTimestamp(proposal, expirationTime));

    return now > expiresAt ? 'expired' : 'open';
}

// Returns the IPFS CID stored in the proposal text bytes.
export function decodeIpfsPath(hex) {
    const text = hexToString(hex || '');

    return text.startsWith('ipfs://') ? text.slice(7) : text;
}

// Returns the addresses referenced across storage, proposals, and votes.
export function collectRelevantAddresses(storage, proposals, voteRecords) {
    const addresses = new Set();

    storage?.users?.forEach(address => addresses.add(address));
    storage?.proposed_users?.forEach(address => addresses.add(address));

    proposals?.forEach(proposalRecord => {
        const proposal = proposalRecord.value;
        proposal.issuer && addresses.add(proposal.issuer);
        proposal.user && addresses.add(proposal.user);
        proposal.mutez_transfers?.forEach(transfer => addresses.add(transfer.destination));
        proposal.token_transfers?.distribution?.forEach(transfer => addresses.add(transfer.destination));
    });

    voteRecords?.forEach(voteRecord => {
        voteRecord.key?.address && addresses.add(voteRecord.key.address);
    });

    return Array.from(addresses);
}

// Returns a proposal-id keyed lookup of votes.
export function buildVoteLookup(voteRecords) {
    const votes = {};

    voteRecords?.forEach(voteRecord => {
        const proposalId = Number(voteRecord.key?.nat);
        const address = voteRecord.key?.address;

        if (!Number.isFinite(proposalId) || !address) {
            return;
        }

        if (!votes[proposalId]) {
            votes[proposalId] = {};
        }

        votes[proposalId][address] = voteRecord.value;
    });

    return votes;
}

// Returns a proposal-id keyed lookup of vote operations by voter address.
export function buildVoteOperationLookup(voteOperations) {
    const votes = {};

    voteOperations?.forEach(operation => {
        const proposalId = Number(operation.parameter?.value?.proposal_id);
        const voter = operation.sender?.address;

        if (!Number.isFinite(proposalId) || !voter) {
            return;
        }

        if (!votes[proposalId]) {
            votes[proposalId] = {};
        }

        if (!votes[proposalId][voter]) {
            votes[proposalId][voter] = operation;
        }
    });

    return votes;
}

// Returns a proposal-id keyed lookup of execute operations.
export function buildExecutionLookup(executeOperations) {
    const executions = {};

    executeOperations?.forEach(operation => {
        const proposalId = Number(operation.parameter?.value);

        if (Number.isFinite(proposalId) && !executions[proposalId]) {
            executions[proposalId] = operation;
        }
    });

    return executions;
}

function normalizeMutezTransfers(transfers) {
    return (transfers || []).map(transfer => ({
        amount: String(transfer.amount),
        destination: transfer.destination
    }));
}

function normalizeTokenTransfers(tokenTransfers) {
    if (!tokenTransfers) {
        return undefined;
    }

    return {
        fa2: tokenTransfers.fa2,
        token_id: String(tokenTransfers.token_id),
        distribution: (tokenTransfers.distribution || []).map(transfer => ({
            amount: String(transfer.amount),
            destination: transfer.destination
        }))
    };
}

function proposalMatchesOperation(proposalRecord, operation) {
    const proposal = proposalRecord.value;
    const kind = getProposalKind(proposalRecord);

    if (!proposal || !operation) {
        return false;
    }

    if (proposal.timestamp !== operation.timestamp) {
        return false;
    }

    if (proposal.issuer !== operation.sender?.address) {
        return false;
    }

    if (operation.entrypoint !== getProposalEntrypoint(kind)) {
        return false;
    }

    const parameterValue = operation.parameter?.value;

    if (kind === 'text') {
        return parameterValue === proposal.text;
    }

    if (kind === 'transfer_mutez') {
        return JSON.stringify(normalizeMutezTransfers(parameterValue)) === JSON.stringify(normalizeMutezTransfers(proposal.mutez_transfers));
    }

    if (kind === 'transfer_token') {
        return JSON.stringify(normalizeTokenTransfers(parameterValue)) === JSON.stringify(normalizeTokenTransfers(proposal.token_transfers));
    }

    if (kind === 'add_user' || kind === 'remove_user') {
        return parameterValue === proposal.user;
    }

    if (kind === 'minimum_votes') {
        return String(parameterValue) === String(proposal.minimum_votes);
    }

    if (kind === 'expiration_time') {
        return String(parameterValue) === String(proposal.expiration_time);
    }

    if (kind === 'lambda_function') {
        return JSON.stringify(parameterValue) === JSON.stringify(proposal.lambda_function);
    }

    return false;
}

// Returns a proposal-id keyed lookup of proposal creation operations.
export function buildProposalOperationLookup(proposals, proposalOperations) {
    const operations = {};

    proposals?.forEach(proposalRecord => {
        const proposalId = Number(proposalRecord.key);
        const operation = proposalOperations?.find(currentOperation => proposalMatchesOperation(proposalRecord, currentOperation));

        if (Number.isFinite(proposalId) && operation) {
            operations[proposalId] = operation;
        }
    });

    return operations;
}

function getUsersAtTimestamp(storageHistory, referenceTimestamp, fallbackUsers) {
    if (!referenceTimestamp) {
        return [...(fallbackUsers || [])];
    }

    const referenceTime = Date.parse(referenceTimestamp);
    const snapshots = [...(storageHistory || [])].sort((left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp));
    let users = [...(fallbackUsers || [])];

    snapshots.forEach(snapshot => {
        if (Date.parse(snapshot.timestamp) <= referenceTime && snapshot.value?.users) {
            users = [...snapshot.value.users];
        }
    });

    return users;
}

// Returns enriched proposal records for list/detail/member views.
export function buildProposalRecords({
    storage,
    proposals,
    voteRecords,
    proposalOperations,
    voteOperations,
    executeOperations,
    storageHistory,
    userAddress,
    now = Date.now(),
}) {
    if (!(storage && proposals)) {
        return [];
    }

    const minimumVotes = Number(storage.minimum_votes || 0);
    const expirationTime = Number(storage.expiration_time || 0);
    const currentUsers = storage.users || [];
    const votesByProposal = buildVoteLookup(voteRecords);
    const voteOperationsByProposal = buildVoteOperationLookup(voteOperations);
    const executeOperationsByProposal = buildExecutionLookup(executeOperations);
    const proposalOperationsByProposal = buildProposalOperationLookup(proposals, proposalOperations);

    return proposals.map(proposalRecord => {
        const proposalId = Number(proposalRecord.key);
        const proposal = proposalRecord.value;
        const kind = getProposalKind(proposalRecord);
        const votes = votesByProposal[proposalId] || {};
        const yesVoters = Object.keys(votes).filter(address => votes[address] === true);
        const noVoters = Object.keys(votes).filter(address => votes[address] === false);
        const executeOperation = executeOperationsByProposal[proposalId];
        const status = getProposalStatus(proposal, expirationTime, now);
        const expiresAt = getProposalExpiryTimestamp(proposal, expirationTime);
        const eligibilityTimestamp = status === 'executed'
            ? executeOperation?.timestamp || proposal.timestamp
            : status === 'expired'
                ? expiresAt
                : undefined;
        const eligibleUsers = status === 'open'
            ? [...currentUsers]
            : getUsersAtTimestamp(storageHistory, eligibilityTimestamp, currentUsers);
        const pendingVoters = eligibleUsers.filter(address => votes[address] === undefined);
        const userVote = userAddress ? votes[userAddress] : undefined;

        return {
            id: proposalId,
            key: proposalRecord.key,
            kind,
            metadata: PROPOSAL_KIND_METADATA[kind],
            variantTag: PROPOSAL_VARIANT_TAGS[kind],
            proposal,
            votes,
            yesVoters,
            noVoters,
            pendingVoters,
            eligibleUsers,
            userVote,
            isAwaitingUser: Boolean(userAddress && currentUsers.includes(userAddress) && status === 'open' && userVote === undefined),
            canExecute: status === 'open' && yesVoters.length >= minimumVotes,
            createdAt: proposal.timestamp,
            expiresAt,
            executedAt: executeOperation?.timestamp,
            status,
            ipfsCid: proposal.text ? decodeIpfsPath(proposal.text) : undefined,
            proposalOperation: proposalOperationsByProposal[proposalId],
            executeOperation,
            voteOperations: voteOperationsByProposal[proposalId] || {},
        };
    }).sort((left, right) => right.id - left.id);
}

// Returns eligibility-aware participation stats for the current members view.
export function buildMembersDirectory(proposalRecords, currentUsers) {
    return (currentUsers || []).map(address => {
        let eligible = 0;
        let yes = 0;
        let no = 0;
        let lastProposalId;

        proposalRecords.forEach(proposalRecord => {
            const isEligible = proposalRecord.eligibleUsers.includes(address);

            if (!isEligible) {
                return;
            }

            eligible += 1;

            if (proposalRecord.votes[address] === true) {
                yes += 1;
                lastProposalId = Math.max(lastProposalId || 0, proposalRecord.id);
            }

            if (proposalRecord.votes[address] === false) {
                no += 1;
                lastProposalId = Math.max(lastProposalId || 0, proposalRecord.id);
            }
        });

        const participation = yes + no;

        return {
            address,
            eligible,
            yes,
            no,
            participation,
            participationRate: eligible > 0 ? Math.round(participation * 100 / eligible) : 0,
            lastProposalId,
        };
    }).sort((left, right) => {
        if (right.participation !== left.participation) {
            return right.participation - left.participation;
        }

        return left.address.localeCompare(right.address);
    });
}

// Uploads a file to the ipfs proxy
export async function uploadFileToIPFSProxy(file) {
    const form_data = new FormData();
    form_data.append('asset', file);
    return await axios.post(IPFS_UPLOAD_PROXY + '/single', form_data, { headers: { 'Content-Type': 'multipart/form-data' } });
}

// Transforms a string to hex bytes
export function stringToHex(str) {
    return Array.from(str).reduce((hex, c) => hex += c.charCodeAt(0).toString(16).padStart(2, '0'), '');
}

// Transforms some hex bytes to a string
export function hexToString(hex) {
    if (!hex) {
        return '';
    }

    return (hex.match(/.{1,2}/g) || []).reduce((acc, char) => acc + String.fromCharCode(parseInt(char, 16)), '');
}
