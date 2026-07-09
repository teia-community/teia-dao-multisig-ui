import { buildMembersDirectory } from './utils';


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