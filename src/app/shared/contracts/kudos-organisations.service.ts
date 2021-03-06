import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/first';
import 'rxjs/add/operator/toPromise';

import * as KudosOrganisationsDefinition from '../../../../build/contracts/KudosOrganisations.json';

import { SmartContract } from './smart-contract.abstract';
import { Contract } from './truffle.interface';
import { Web3Service, ConnectionStatus } from '../web3.service';
import { SmartContractExtender, OwnableMixin } from './mixins';

interface KudosOrganisationsConstants {
  getOrganisations: string[];
  isInDirectory: boolean;
  organisationIndex: number;
}
interface KudosOrganisationsActions {
  newOrganisation: boolean;
  removeOrganisation: boolean;
}
interface KudosOrganisationsEvents {
  NewOrganisation: {kudosToken: string};
}
export type KudosOrganisations = KudosOrganisationsActions & KudosOrganisationsConstants & KudosOrganisationsEvents;

Web3Service.addABI(KudosOrganisationsDefinition.abi);

class KudosOrganisationsSmartContract
  extends SmartContract<KudosOrganisationsConstants, {}, KudosOrganisationsActions, KudosOrganisationsEvents> { }

@Injectable()
export class KudosOrganisationsService extends SmartContractExtender(KudosOrganisationsSmartContract, OwnableMixin) {

  // Events
  readonly NewOrganisation$ = this.generateEventObservable('NewOrganisation');

  // Constants
  readonly getOrganisations = () => this.generateConstant('getOrganisations')();
  readonly isInDirectory = (address: string) => this.generateConstant('isInDirectory')(address);
  readonly organisationIndex = (address: string) => this.generateConstant('organisationIndex')(address);

  // Actions
  readonly newOrganisation =
    (tokenOrganisationName: string, tokenName: string, tokenSymbol: string, decimalUnits: number, addToDirectory: boolean) =>
      this.generateAction('newOrganisation')(tokenOrganisationName, tokenName, tokenSymbol, decimalUnits, addToDirectory)
  readonly removeOrganisation = (address: string) => this.generateAction('removeOrganisation')(address);

  constructor(protected web3Service: Web3Service, protected store: Store<any>) {
    super(web3Service, store);
    this.web3Service
      .status$
      .filter(status => status === ConnectionStatus.Total)
      .first()
      .subscribe(() => {
        const kudosOrganisation = this.getContract(KudosOrganisationsDefinition);

        kudosOrganisation.deployed()
          .then(contract => {
            this.web3Contract = this.getWeb3Contract(KudosOrganisationsDefinition.abi, (<any>contract).address);

            this.contract = <any>contract;
            this.initialized = true;
          });
      });
  }
}
