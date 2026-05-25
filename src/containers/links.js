import React, { useContext } from 'react';
import { NETWORK, IPFS_GATEWAY, TOKENS } from '../constants';
import { MultisigContext } from './context';
import { buildAccountLink, shortenAddress } from './utils';


export function DefaultLink(props) {
    return (
        <a href={props.href} target='_blank' rel='noreferrer' className={props.className ? props.className : ''}>
            {props.children}
        </a>
    );
}

export function TzktLink(props) {
    return (
        <DefaultLink href={buildAccountLink(props.address, NETWORK)} className={props.className ? props.className : ''}>
            {props.children}
        </DefaultLink>
    );
}

export function TezosAddressLink(props) {
    // Get the required multisig context information
    const { userAliases } = useContext(MultisigContext);

    // Get the user alias
    const alias = userAliases && userAliases[props.address];
    const shortened = props.shorten ? shortenAddress(props.address, 5, 5) : props.address;

    let content = props.children;

    if (!content) {
        if (props.useAlias && alias) {
            content = (
                <>
                    <span className='tezos-address-primary'>{shortened}</span>
                    <span className='tezos-address-secondary'>{alias}</span>
                </>
            );
        } else {
            content = shortened;
        }
    }

    return (
        <TzktLink address={props.address} className={`tezos-address ${props.className ? props.className : ''}`}>
            {content}
        </TzktLink>
    );
}

export function TokenLink(props) {
    const token = TOKENS.find(token => token.fa2 === props.fa2);

    if (token?.website) {
        return (
            <DefaultLink href={token.website + props.id} className={`token-link ${props.className ? props.className : ''}`}>
                {props.children}
            </DefaultLink>
        );
    } else {
        return (
            <TzktLink address={props.fa2} className={`token-link ${props.className ? props.className : ''}`}>
                {props.children}
            </TzktLink>
        );
    }
}

export function IpfsLink(props) {
    return (
        <DefaultLink href={IPFS_GATEWAY + props.path} className={`ipfs-link ${props.className ? props.className : ''}`}>
            {props.children ? props.children : props.path}
        </DefaultLink>
    );
}
