import { TestBed } from '@angular/core/testing';
import { StoreModule, Store } from '@ngrx/store';
import { ROOT_EFFECTS_INIT } from '@ngrx/effects';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import { hot, cold } from 'jasmine-marbles';

import { PROVIDERS } from '../../';
import { State, reducers } from '../';

import { reduceActions } from '../testing-utils';

import { ConnectionStatus, networkType, providerType } from '../../web3.service';

import { statusReducer } from './status.reducers';
import * as fromStatus from './status.reducers';
import * as statusActions from './status.actions';
import { StatusEffects } from './status.effects';

describe('Status - Reducers', () => {
  it('should be auto-initialized', () => {
    const finalState = reduceActions(statusReducer);
    expect(finalState).not.toBeUndefined();
  });

  it('should be able to update the status', () => {
    const steps = reduceActions(statusReducer, [
      new statusActions.SetStatusAction(ConnectionStatus.NoNetwork),
      new statusActions.SetStatusAction(ConnectionStatus.NoProvider),
      new statusActions.SetStatusAction(ConnectionStatus.NoAccount),
      new statusActions.SetStatusAction(ConnectionStatus.Total),
    ], true);

    const status = steps.map(fromStatus.getStatus);

    expect(status).toEqual([
      undefined,
      ConnectionStatus.NoNetwork,
      ConnectionStatus.NoProvider,
      ConnectionStatus.NoAccount,
      ConnectionStatus.Total,
    ]);
  });

  it('should set the network id and name', () => {
    const steps = reduceActions(statusReducer, [
      new statusActions.SetNetworkAction(3, 'ropsten'),
    ], true);

    const network = steps.map(fromStatus.getNetwork);

    expect(network).toEqual([
      {id: undefined, name: undefined},
      {id: 3, name: 'ropsten'},
    ]);
  });

  it('should set the provider', () => {
    const steps = reduceActions(statusReducer, [
      new statusActions.SetProviderAction('MetaMask'),
    ], true);

    const provider = steps.map(fromStatus.getProvider);

    expect(provider).toEqual([
      undefined,
      'MetaMask',
    ]);
  });
});

describe('Status - Effects', () => {
  let store: Store<State>;
  let effects: StatusEffects;
  let actions: Observable<any>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        StoreModule.forRoot({
          ...reducers,
        }),
      ],
      providers: [
        ...PROVIDERS,
        StatusEffects,
        provideMockActions(() => actions),
      ],
    });

    effects = TestBed.get(StatusEffects);
    store = TestBed.get(Store);
  });

  it('should watch for status changes', () => {
    const fakeStatus = cold('p--a-n---t|', {
      n: ConnectionStatus.NoNetwork,
      p: ConnectionStatus.NoProvider,
      a: ConnectionStatus.NoAccount,
      t: ConnectionStatus.Total,
    });

    spyOn(effects, 'getWeb3Status').and.returnValue(fakeStatus);

    actions = hot('-a', {
      a: {type: ROOT_EFFECTS_INIT},
    });

    const expected = cold('-p--a-n---t|', {
      n: new statusActions.SetStatusAction(ConnectionStatus.NoNetwork),
      p: new statusActions.SetStatusAction(ConnectionStatus.NoProvider),
      a: new statusActions.SetStatusAction(ConnectionStatus.NoAccount),
      t: new statusActions.SetStatusAction(ConnectionStatus.Total),
    });

    expect(effects.watchStatusChanges$).toBeObservable(expected);
  });

  it('should set the network data', () => {
    spyOn((<any>effects).web3Service, 'getNetworkId').and.returnValue(Observable.of(1));
    spyOn((<any>effects).web3Service, 'getNetworkType').and.returnValue(Observable.of('main'));

    actions = hot('-a', {
      a: {type: ROOT_EFFECTS_INIT},
    });

    const expected = cold('-(r|)', {
      r: new statusActions.SetNetworkAction(1, 'main'),
    });

    expect(effects.setNetworkData$).toBeObservable(expected);
  });

  it('should set the provider name', () => {
    spyOn((<any>effects).web3Service, 'getProvider').and.returnValue('MetaMask');

    actions = hot('-a', {
      a: {type: ROOT_EFFECTS_INIT},
    });

    const expected = cold('-(r|)', {
      r: new statusActions.SetProviderAction('MetaMask'),
    });

    expect(effects.setProviderType$).toBeObservable(expected);
  });
});
