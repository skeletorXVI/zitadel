import { SelectionModel } from '@angular/cdk/collections';
import { AfterViewInit, Component, Input, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSelectChange } from '@angular/material/select';
import { MatTable } from '@angular/material/table';
import { tap } from 'rxjs/operators';
import { ProjectGrant, ProjectRoleView, UserGrant, UserGrantSearchKey } from 'src/app/proto/generated/management_pb';
import { MgmtUserService } from 'src/app/services/mgmt-user.service';
import { ProjectService } from 'src/app/services/project.service';
import { ToastService } from 'src/app/services/toast.service';

import { UserGrantsDataSource } from './user-grants-datasource';

@Component({
    selector: 'app-user-grants',
    templateUrl: './user-grants.component.html',
    styleUrls: ['./user-grants.component.scss'],
})
export class UserGrantsComponent implements OnInit, AfterViewInit {
    @Input() filterValue: string = '';
    @Input() filter: UserGrantSearchKey = UserGrantSearchKey.USERGRANTSEARCHKEY_USER_ID;
    public grants: UserGrant.AsObject[] = [];

    public dataSource!: UserGrantsDataSource;
    public selection: SelectionModel<UserGrant.AsObject> = new SelectionModel<UserGrant.AsObject>(true, []);
    @ViewChild(MatPaginator) public paginator!: MatPaginator;
    @ViewChild(MatTable) public table!: MatTable<ProjectGrant.AsObject>;

    @Input() allowCreate: boolean = false;
    @Input() allowDelete: boolean = false;

    public roleOptions: ProjectRoleView.AsObject[] = [];

    constructor(
        private userService: MgmtUserService,
        private projectService: ProjectService,
        private toast: ToastService,
    ) { }

    public displayedColumns: string[] = ['select',
        'user',
        'org',
        'projectId', 'creationDate', 'changeDate', 'roleNamesList'];

    public ngOnInit(): void {
        this.dataSource = new UserGrantsDataSource(this.userService);
        this.dataSource.loadGrants(this.filter, this.filterValue, 0, 25);

        if (this.filter === UserGrantSearchKey.USERGRANTSEARCHKEY_PROJECT_ID) {
            this.getRoleOptions(this.filterValue);
        }
    }

    public ngAfterViewInit(): void {
        this.paginator.page
            .pipe(
                tap(() => this.loadGrantsPage()),
            )
            .subscribe();
    }

    private loadGrantsPage(): void {
        this.dataSource.loadGrants(
            this.filter,
            this.filterValue,
            this.paginator.pageIndex,
            this.paginator.pageSize,
        );
    }

    public isAllSelected(): boolean {
        const numSelected = this.selection.selected.length;
        const numRows = this.dataSource.grantsSubject.value.length;
        return numSelected === numRows;
    }

    public masterToggle(): void {
        this.isAllSelected() ?
            this.selection.clear() :
            this.dataSource.grantsSubject.value.forEach(row => this.selection.select(row));
    }

    public loadRoleOptions(projectId: string): void {
        if (this.filter === UserGrantSearchKey.USERGRANTSEARCHKEY_USER_ID) {
            this.getRoleOptions(projectId);
        }
    }

    public getRoleOptions(projectId: string): void {
        this.projectService.SearchProjectRoles(projectId, 100, 0).then(resp => {
            this.roleOptions = resp.toObject().resultList;
            console.log(this.roleOptions);
        });
    }

    updateRoles(grant: UserGrant.AsObject, selectionChange: MatSelectChange): void {
        console.log(grant, selectionChange.value);
        this.userService.UpdateUserGrant(grant.id, grant.userId, selectionChange.value)
            .then((newmember: UserGrant) => {
                console.log(newmember.toObject());
                this.toast.showInfo('Grant updated!');
            }).catch(error => {
                this.toast.showError(error.message);
            });
    }
}