import { buildMembersDirectory, findToken, formatTokenAmount, toBaseUnits } from './utils';


describe('formatTokenAmount', () => {
    test('formats base units using the token decimals', () => {
        expect(formatTokenAmount('100000000', 6)).toBe('100');
        expect(formatTokenAmount('450000', 6)).toBe('0.45');
        expect(formatTokenAmount('1234567890123', 6)).toBe('1,234,567.890123');
        expect(formatTokenAmount('1', 6)).toBe('0.000001');
        expect(formatTokenAmount(BigInt(5), 0)).toBe('5');
        expect(formatTokenAmount(undefined)).toBe('0');
    });

    test('keeps amounts beyond the float range exact', () => {
        expect(formatTokenAmount('1000000000000000000001', 18)).toBe('1,000.000000000000000001');
    });
});

describe('toBaseUnits', () => {
    test('converts decimal amounts without float rounding', () => {
        expect(toBaseUnits('1.005', 6)).toBe('1005000');
        expect(toBaseUnits('100', 6)).toBe('100000000');
        expect(toBaseUnits('0.000001', 6)).toBe('1');
        expect(toBaseUnits('.5', 6)).toBe('500000');
        expect(toBaseUnits('3.', 0)).toBe('3');
        expect(toBaseUnits(0, 6)).toBe('0');
        expect(toBaseUnits('7', 0)).toBe('7');
    });

    test('rejects invalid amounts', () => {
        expect(toBaseUnits('1.0000001', 6)).toBeUndefined();
        expect(toBaseUnits('1.5', 0)).toBeUndefined();
        expect(toBaseUnits('', 6)).toBeUndefined();
        expect(toBaseUnits('.', 6)).toBeUndefined();
        expect(toBaseUnits('-1', 6)).toBeUndefined();
        expect(toBaseUnits('1e5', 6)).toBeUndefined();
    });
});

describe('findToken', () => {
    test('matches fungible tokens by contract and token id', () => {
        expect(findToken('KT1XnTn74bUtxHfDtBmm2bGZAQfhPbvKWR8o', '0')?.symbol).toBe('USDt');
        expect(findToken('KT1UsSfaXyqcjSVPeiD7U1bWgKy3taYN7NWY', 2)?.symbol).toBe('USDC.e');
        expect(findToken('KT1UsSfaXyqcjSVPeiD7U1bWgKy3taYN7NWY', '0')).toBeUndefined();
    });

    test('matches NFT contracts for any token id', () => {
        expect(findToken('KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton', '123')?.decimals).toBe(0);
    });
});


describe('buildMembersDirectory', () => {
    test('tracks yes, no, and missed participation per eligible proposal', () => {
        const proposalRecords = [
            {
                id: 5,
                kind: 'text',
                metadata: { label: 'text proposal' },
                eligibleUsers: ['tz1-active', 'tz1-secondary'],
                votes: { 'tz1-active': true },
            },
            {
                id: 4,
                kind: 'remove_user',
                metadata: { label: 'remove member' },
                eligibleUsers: ['tz1-active', 'tz1-secondary'],
                votes: { 'tz1-active': false, 'tz1-secondary': true },
            },
            {
                id: 3,
                kind: 'add_user',
                metadata: { label: 'add member' },
                eligibleUsers: ['tz1-active'],
                votes: {},
            },
        ];

        const rows = buildMembersDirectory(proposalRecords, ['tz1-active', 'tz1-secondary']);
        const activeRow = rows.find(row => row.address === 'tz1-active');
        const secondaryRow = rows.find(row => row.address === 'tz1-secondary');

        expect(activeRow).toMatchObject({
            address: 'tz1-active',
            eligible: 3,
            yes: 1,
            no: 1,
            missed: 1,
            participation: 2,
            participationRate: 67,
            lastProposalId: 5,
        });
        expect(activeRow.participationHistory).toEqual([
            { proposalId: 3, label: 'add member', state: 'missed' },
            { proposalId: 4, label: 'remove member', state: 'no' },
            { proposalId: 5, label: 'text proposal', state: 'yes' },
        ]);

        expect(secondaryRow).toMatchObject({
            address: 'tz1-secondary',
            eligible: 2,
            yes: 1,
            no: 0,
            missed: 1,
            participation: 1,
            participationRate: 50,
            lastProposalId: 4,
        });
        expect(secondaryRow.participationHistory).toEqual([
            { proposalId: 4, label: 'remove member', state: 'yes' },
            { proposalId: 5, label: 'text proposal', state: 'missed' },
        ]);
    });
});