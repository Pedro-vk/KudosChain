import { TestBed } from '@angular/core/testing';
import { StoreModule, Store, combineReducers } from '@ngrx/store';
import { ROOT_EFFECTS_INIT } from '@ngrx/effects';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/do';
import { hot, cold } from 'jasmine-marbles';

import { PROVIDERS } from '../../';
import { State, reducers } from '../';

import { reduceActions } from '../testing-utils';

import { kudosTokenReducer } from './kudos-token.reducers';
import * as fromKudosToken from './kudos-token.reducers';
import * as kudosTokenActions from './kudos-token.actions';
import { KudosTokenEffects } from './kudos-token.effects';

const newAccount = n => `0x${'0'.repeat(40 - String(n).length)}${n}`;
const newTx = n => `0x${'0'.repeat(65 - String(n).length)}${n}`;

describe('KudosToken - Reducers', () => {
  it('should be auto-initialized', () => {
    const finalState = reduceActions(kudosTokenReducer);
    expect(finalState).not.toBeUndefined();
  });

  it('should set loading state', () => {
    const steps = reduceActions(kudosTokenReducer, [
      new kudosTokenActions.LoadBasicDataAction(newAccount(1)),
      new kudosTokenActions.SetTokenDataAction(newAccount(1), 'basic', {}),
      new kudosTokenActions.LoadTotalDataAction(newAccount(1)),
      new kudosTokenActions.SetTokenDataAction(newAccount(1), 'total', {}),
      new kudosTokenActions.LoadBasicDataAction(newAccount(2)),
      new kudosTokenActions.SetTokenDataAction(newAccount(2), 'basic', {}),
    ], true);

    const kudosTokens = steps.map(fromKudosToken.getKudosTokensById);

    expect(kudosTokens).toEqual([
      {},
      {[newAccount(1)]: {loading: true, loaded: {}}},
      {[newAccount(1)]: {loading: false, loaded: {basic: true}}},
      {[newAccount(1)]: {loading: true, loaded: {basic: true}}},
      {[newAccount(1)]: {loading: false, loaded: {basic: true, total: true}}},
      {[newAccount(1)]: {loading: false, loaded: {basic: true, total: true}}, [newAccount(2)]: {loading: true, loaded: {}}},
      {[newAccount(1)]: {loading: false, loaded: {basic: true, total: true}}, [newAccount(2)]: {loading: false, loaded: {basic: true}}},
    ]);
  });

  it('should set the data of a KudosToken', () => {
    const steps = reduceActions(kudosTokenReducer, [
      new kudosTokenActions.LoadBasicDataAction(newAccount(1)),
      new kudosTokenActions.SetTokenDataAction(newAccount(1), 'basic', {name: 'test'}),
      new kudosTokenActions.LoadTotalDataAction(newAccount(1)),
      new kudosTokenActions.SetTokenDataAction(newAccount(1), 'total', {isActivePoll: true}),
    ], true);

    const kudosTokens = steps.map(fromKudosToken.getKudosTokensById);

    expect(kudosTokens).toEqual([
      {},
      {[newAccount(1)]: {loading: true, loaded: {}}},
      {[newAccount(1)]: {loading: false, loaded: {basic: true}, name: 'test'}},
      {[newAccount(1)]: {loading: true, loaded: {basic: true}, name: 'test'}},
      {[newAccount(1)]: {loading: false, loaded: {basic: true, total: true}, name: 'test', isActivePoll: true}},
    ]);
  });

  it('should set the balance of a member', () => {
    const steps = reduceActions(kudosTokenReducer, [
      new kudosTokenActions.LoadBasicDataAction(newAccount(1)),
      new kudosTokenActions.SetTokenDataAction(newAccount(1), 'basic', {name: 'test'}),
      new kudosTokenActions.SetBalanceAction(newAccount(1), newAccount(11), 9 * 10 ** 17),
    ], true);

    const kudosTokens = steps.map(fromKudosToken.getKudosTokensById);

    expect(kudosTokens).toEqual([
      {},
      {[newAccount(1)]: {loading: true, loaded: {}}},
      {[newAccount(1)]: {loading: false, loaded: {basic: true}, name: 'test'}},
      {[newAccount(1)]: {loading: false, loaded: {basic: true}, name: 'test', balances: {[newAccount(11)]: 9 * 10 ** 17}}},
    ]);
  });
});

describe('KudosToken - Effects', () => {
  let store: Store<State>;
  let effects: KudosTokenEffects;
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
        KudosTokenEffects,
        provideMockActions(() => actions),
      ],
    });

    effects = TestBed.get(KudosTokenEffects);
    store = TestBed.get(Store);
  });

  it('should get basic KudosToken data', () => {
    const setDataSpy = spyOn(effects, 'setData').and.returnValue(Observable.of({type: 'mock'}));

    actions = hot('-a', {
      a: new kudosTokenActions.LoadBasicDataAction(newAccount(1)),
    });

    const expected = cold('-r', {
      r: {type: 'mock'},
    });

    expect(effects.getBasicKudosTokenData$).toBeObservable(expected);
    expect(setDataSpy).toHaveBeenCalledWith(newAccount(1), 'basic', false, jasmine.any(Function));
  });

  it('should get total KudosToken data', () => {
    const setDataSpy = spyOn(effects, 'setData').and.returnValue(Observable.of({type: 'mock'}));

    actions = hot('-a', {
      a: new kudosTokenActions.LoadTotalDataAction(newAccount(1)),
    });

    const expected = cold('-r', {
      r: {type: 'mock'},
    });

    expect(effects.getTotalKudosTokenData$).toBeObservable(expected);
    expect(setDataSpy).toHaveBeenCalledWith(newAccount(1), 'total', false, jasmine.any(Function));
  });

  it('should get data', done => {
    spyOn(effects, 'resolvePromise').and.returnValue(Observable.of({name: 'test'}));
    const getKudosTokenServiceAtSpy = spyOn((effects as any).kudosTokenFactoryService, 'getKudosTokenServiceAt')
      .and.returnValue({onIsValid: Observable.of(true)});

    effects.setData(newAccount(1), 'basic', false, async() => ({}))
      .subscribe(action => {
        expect(action).toEqual(new kudosTokenActions.SetTokenDataAction(newAccount(1), 'basic', {name: 'test'}));
        expect(getKudosTokenServiceAtSpy).toHaveBeenCalledWith(newAccount(1));
        done();
      });
  });

  it('should update the data of a KudosToken when has changes', () => {
    let account1WatchStep = 0;
    const account1Changes = hot('---c--------c', {c: newAccount(1)})
      .do(() => store.dispatch(new kudosTokenActions.SetTokenDataAction(newAccount(1), account1WatchStep++ ? 'total' : 'basic', {})));
    const account2Changes = hot('-------c', {c: newAccount(2)})
      .do(() => store.dispatch(new kudosTokenActions.SetTokenDataAction(newAccount(2), 'basic', {})));

    spyOn((<any>effects).web3Service, 'watchContractChanges')
      .and.callFake(address => ({
        [newAccount(1)]: account1Changes,
        [newAccount(2)]: account2Changes,
      }[address]));

    actions = hot('-a----x---b', {
      a: new kudosTokenActions.LoadBasicDataAction(newAccount(1)),
      b: new kudosTokenActions.LoadTotalDataAction(newAccount(1)),
      x: new kudosTokenActions.LoadBasicDataAction(newAccount(2)),
    });

    const expected = cold('---a---x----(ab)', {
      a: new kudosTokenActions.LoadBasicDataAction(newAccount(1), true),
      b: new kudosTokenActions.LoadTotalDataAction(newAccount(1), true),
      x: new kudosTokenActions.LoadBasicDataAction(newAccount(2), true),
    });

    expect(effects.watchKudosTokenChanges$).toBeObservable(expected);
  });
});
