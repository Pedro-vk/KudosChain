import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/from';
import 'rxjs/add/observable/merge';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/delay';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/first';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/shareReplay';
import 'rxjs/add/operator/startWith';
import 'rxjs/add/operator/takeWhile';

import { Web3Service, ConnectionStatus, KudosTokenFactoryService } from '../shared';
import { ShareDialogComponent } from '../components';

import * as fromRoot from '../shared/store/reducers';

@Component({
  selector: 'eth-kudos-app',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  readonly status$ = this.store.select(fromRoot.getStatus);
  readonly account$ = this.store.select(fromRoot.getAccount);
  readonly pendingTransactions$ = this.store.select(fromRoot.getPendingTransactions);
  readonly balance$ = this.store.select(fromRoot.getBalance);

  readonly kudosToken$ = this.store.select(fromRoot.getCurrentKudosTokenWithFullData)
    .filter(_ => !!_)
    .shareReplay();
  readonly loadingStatus$ = this.kudosToken$
    .filter(_ => !!_ && !!_.polls)
    .map(({loaded, polls, activePoll}) => {
      const total = (loaded.pollsProgress.total * 2) + 3;
      const pollsSize = loaded.pollsProgress.total;
      const loadedPolls = loaded.pollsProgress.total - loaded.pollsProgress.pending;
      const fullLoadedPolls = loaded.pollsProgress.total - loaded.pollsProgress.pendingFull;
      const allPollsLoaded = loaded.pollsProgress.pending === 0;
      const allPollsFullLoaded = loaded.pollsProgress.pendingFull === 0;
      const activePollLoaded = !!(activePoll && activePoll.loaded && activePoll.loaded.basic) ? 1 : 0;
      return {
        value: (allPollsFullLoaded ? total : 1 + activePollLoaded + (allPollsLoaded ? pollsSize : 0)) / total * 100,
        buffer: (1 + activePollLoaded + (allPollsLoaded ? 1 : 0) + loadedPolls + fullLoadedPolls) / total * 100,
      };
    })
    .mergeMap(progress => {
      if (progress.value === 100) {
        return Observable.merge(
          Observable.of(progress),
          Observable.from([undefined, false]).delay(2000),
        );
      }
      return Observable.of(progress);
    })
    .takeWhile((_: any) => _ !== false)
    .startWith(<any>true);

  constructor(
    private store: Store<fromRoot.State>,
    private web3Service: Web3Service,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private matDialog: MatDialog,
  ) { }

  ngOnInit() {
    this.kudosToken$
      .filter(_ => _ && !!_.address)
      .first()
      .subscribe(kudosToken => {
        if (localStorage && kudosToken.address) {
          localStorage.setItem('kudos-address', kudosToken.address);
        }
      });
    this.status$
      .filter(_ => _ !== ConnectionStatus.Total)
      .first()
      .subscribe(() => this.router.navigate(['/error', status]));
  }

  goToEtherscan(tx: string): void {
    this.web3Service.goToEtherscan(tx);
  }

  openShareDialog() {
    this.activatedRoute.params
      .subscribe(({tokenAddress}) => this.matDialog.open(ShareDialogComponent, {data: tokenAddress}));
  }

  share() {
    if ((navigator as any).share) {
      this.openShareDialog();
      return;
    }
    this.kudosToken$
      .subscribe(kudosToken => {
        (navigator as any)
          .share({
            title: `Join ${kudosToken.name}`,
            url: `{document.location.origin}/${kudosToken.address}`,
          })
          .then(() => {})
          .catch(() => {});
      });
  }

  routeIs(url: string): boolean {
    return this.router.url.split('/').slice(2).join('/') === url.replace(/^\//, '');
  }

  trackTransaction(index: string, transaction: {hash: string}): string {
    return transaction.hash || undefined;
  }
}
