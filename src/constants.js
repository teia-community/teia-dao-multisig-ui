
export const NETWORK = 'mainnet';

export const CONTRACT_ADDRESS = 'KT1J9FYz29RBQi1oGLw8uXyACrzXzV1dHuvb';

export const RPC_NODE = 'https://mainnet.teia.rocks';

export const IPFS_UPLOAD_PROXY = 'https://ipfsmsg.teia.art';

export const IPFS_GATEWAY = 'https://ipfsmsg.teia.art/ipfs/';

// Known FA2 tokens. `decimals` is the number of decimal places used to display
// amounts (0 for NFT editions). Fungible tokens also set `symbol`, and `tokenId`
// so that other tokens in the same contract are not shown with the wrong decimals.
export const TOKENS = [
    {
        name: 'OBJKT',
        fa2: 'KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton',
        multiasset: true,
        decimals: 0,
        website: 'https://teia.art/objkt/'
    },
    {
        name: 'hDAO',
        symbol: 'hDAO',
        fa2: 'KT1AFA2mwNUMNd4SsujE1YYp29vd8BZejyKW',
        tokenId: '0',
        multiasset: false,
        decimals: 6,
        website: undefined
    },
    {
        name: 'TEIA',
        symbol: 'TEIA',
        fa2: 'KT1QrtA753MSv8VGxkDrKKyJniG5JtuHHbtV',
        tokenId: '0',
        multiasset: false,
        decimals: 6,
        website: undefined
    },
    {
        name: 'USDt',
        symbol: 'USDt',
        fa2: 'KT1XnTn74bUtxHfDtBmm2bGZAQfhPbvKWR8o',
        tokenId: '0',
        multiasset: false,
        decimals: 6,
        website: undefined
    },
    {
        name: 'USDC.e',
        symbol: 'USDC.e',
        fa2: 'KT1UsSfaXyqcjSVPeiD7U1bWgKy3taYN7NWY',
        tokenId: '2',
        multiasset: false,
        decimals: 6,
        website: undefined
    },
    {
        name: 'Tezzardz',
        fa2: 'KT1LHHLso8zQWQWg1HUukajdxxbkGfNoHjh6',
        multiasset: true,
        decimals: 0,
        website: 'https://objkt.com/asset/tezzardz/'
    },
    {
        name: 'PRJKTNEON',
        fa2: 'KT1VbHpQmtkA3D4uEbbju26zS8C42M5AGNjZ',
        multiasset: true,
        decimals: 0,
        website: 'https://objkt.com/asset/prjktneon/',
    },
    {
        name: 'Art Cardz',
        fa2: 'KT1LbLNTTPoLgpumACCBFJzBEHDiEUqNxz5C',
        multiasset: true,
        decimals: 0,
        website: 'https://objkt.com/asset/artcardz/'
    },
    {
        name: 'GOGOs',
        fa2: 'KT1SyPgtiXTaEfBuMZKviWGNHqVrBBEjvtfQ',
        multiasset: true,
        decimals: 0,
        website: 'https://objkt.com/asset/gogos/'
    },
    {
        name: 'NEONZ',
        fa2: 'KT1MsdyBSAMQwzvDH4jt2mxUKJvBSWZuPoRJ',
        multiasset: true,
        decimals: 0,
        website: 'https://objkt.com/asset/neonz/'
    },
    {
        name: 'Randomly Common Skeles',
        fa2: 'KT1HZVd9Cjc2CMe3sQvXgbxhpJkdena21pih',
        multiasset: true,
        decimals: 0,
        website: 'https://objkt.com/asset/rcs/'
    },
    {
        name: 'fx_hash',
        fa2: 'KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE',
        multiasset: true,
        decimals: 0,
        website: 'https://www.fxhash.xyz/gentk/'
    },
    {
        name: 'ZIGGURATS',
        fa2: 'KT1PNcZQkJXMQ2Mg92HG1kyrcu3auFX5pfd8',
        multiasset: true,
        decimals: 0,
        website: 'https://objkt.com/asset/ziggurats/'
    }
]
