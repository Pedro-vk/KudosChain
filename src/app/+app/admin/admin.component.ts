import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Store, select } from '@ngrx/store';
import { EMPTY, Observable } from 'rxjs';
import { map, filter, shareReplay, catchError, first } from 'rxjs/operators';

import * as fromRoot from '../../shared/store/reducers';

import { KudosTokenFactoryService, KudosTokenService } from '../../shared';
import { AppCommonAbstract } from '../common.abstract';

@Component({
  selector: 'eth-kudos-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminComponent extends AppCommonAbstract implements OnInit {
  newPoll: {kudosByMember: number, maxKudosToMember: number, minDurationInMinutes: number, working: boolean} = <any>{};
  closePollWorking: boolean;
  newMember: {member: string, contact: string, working: boolean} = <any>{};

  memberName: {[address: string]: string} = {};
  memberWorking: {[address: string]: boolean} = {};

  kudosTokenService: KudosTokenService;

  readonly kudosToken$ = this.store.pipe(
    select(fromRoot.getCurrentKudosTokenWithFullData),
    filter(_ => !!_),
    shareReplay());

  readonly activePoll$ = this.kudosToken$.pipe(
    map(({activePoll}) => activePoll));
  readonly kudosSentOnActivePoll$ = this.activePoll$.pipe(
    filter(kudosPoll => kudosPoll && kudosPoll.totalSupply && kudosPoll.members && !!kudosPoll.kudosByMember),
    map(kudosPoll => {
      const remaining = kudosPoll.totalSupply;
      const total = (kudosPoll.members || []).length * kudosPoll.kudosByMember;
      const sent = total - remaining;
      return {sent, total, progress: sent / total};
    }));

  constructor(
    private store: Store<fromRoot.State>,
    private kudosTokenFactoryService: KudosTokenFactoryService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    protected changeDetectorRef: ChangeDetectorRef,
  ) {
    super();
  }

  ngOnInit(): void {
    this.kudosToken$.pipe(
      filter(({imOwner}) => imOwner === false))
      .subscribe(() => this.router.navigate(['../'], {relativeTo: this.activatedRoute}));

    this.kudosToken$.pipe(
      filter(_ => _ && _.members && !!_.members.length))
      .subscribe(({members}) => {
        members.forEach(({member, name}) => this.memberName[member] = this.memberName[member] || name);
      });

    this.activatedRoute.params.pipe(
      first(),
      catchError(() => EMPTY))
      .subscribe(({address, name}: any) => {
        if (address) {
          this.newMember.member = address;
        }
        if (name) {
          this.newMember.contact = name;
        }
        this.newMember = {...this.newMember};
      });

    this.activatedRoute.parent.params.pipe(
      map(({tokenAddress}) => this.kudosTokenFactoryService.getKudosTokenServiceAt(tokenAddress)))
      .subscribe(kudosTokenService => this.kudosTokenService = kudosTokenService);
  }

  isGoingToFinishOn(minutes: number): number {
    const min = 60 * 1000;
    return Math.round(Date.now() / min) * min + (minutes * min);
  }

  async createPoll(form?: NgForm) {
    const done = (success?) => this.onActionFinished(success, this.newPoll, _ => this.newPoll = _, form);

    this.kudosTokenService
      .newPoll(
        await this.kudosTokenService.fromDecimals(this.newPoll.kudosByMember),
        await this.kudosTokenService.fromDecimals(this.newPoll.maxKudosToMember),
        this.newPoll.minDurationInMinutes,
      )
      .then(() => done(true))
      .catch(err => console.warn(err) || done());
  }

  closePoll() {
    const done = (success?: boolean) => {
      this.closePollWorking = undefined;
      this.changeDetectorRef.markForCheck();
    };
    this.closePollWorking = true;
    this.kudosTokenService
      .closePoll()
      .then(() => done(true))
      .catch(err => console.warn(err) || done());
  }

  addMember(form?: NgForm) {
    const done = (success?) => this.onActionFinished(success, this.newMember, _ => this.newMember = _, form);

    this.newMember.working = true;
    this.kudosTokenService
      .addMember(
        this.newMember.member,
        this.newMember.contact,
      )
      .then(() => done(true))
      .catch(err => console.warn(err) || done());
  }

  editContact(address: string, name: string) {
    const done = (success?: boolean) => {
      this.memberWorking[address] = undefined;
      this.changeDetectorRef.markForCheck();
    };
    this.memberWorking[address] = true;
    this.kudosTokenService
      .editContact(address, name)
      .then(() => done(true))
      .catch(err => console.warn(err) || done());
  }

  removeMember(address: string) {
    const done = (success?: boolean) => {
      if (!success) {
        this.memberWorking[address] = undefined;
        this.changeDetectorRef.markForCheck();
      }
    };
    this.memberWorking[address] = true;
    this.kudosTokenService
      .removeMember(address)
      .then(() => done(true))
      .catch(err => console.warn(err) || done());
  }
}
