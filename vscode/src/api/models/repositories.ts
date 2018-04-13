'use strict';
import { Disposable, Uri, workspace, WorkspaceFolder } from 'vscode';
import { CodeStreamCollection, CodeStreamItem } from './collection';
import { Git } from '../../git/git';
import { Markers } from './markers';
import { CodeStreamSession } from '../session';
import { StreamCollection } from './streams';
import { CSRepository } from '../types';

export class Repository extends CodeStreamItem<CSRepository> {

    constructor(
        session: CodeStreamSession,
        repo: CSRepository,
        private readonly _folder?: WorkspaceFolder
    ) {
        super(session, repo);
    }

    async getMarkers(uri: Uri): Promise<Markers | undefined> {
        if (workspace.getWorkspaceFolder(uri) !== this._folder) return undefined;

        const stream = await this.streams.getByUri(uri);
        if (stream === undefined) return undefined;

        const sha = await Git.getCurrentSha(uri);
        const markers = await this.session.api.getMarkerLocations(sha, stream.id);
        return new Markers(this.session, markers);
    }

    private _streams: StreamCollection | undefined;
    get streams() {
        if (this._streams === undefined) {
            this._streams = new StreamCollection(this.session, this);
        }
        return this._streams;
    }

    get teamId() {
        return this.entity.teamId;
    }

    get url() {
        return this.entity.normalizedUrl;
    }
}

export class RepositoryCollection extends CodeStreamCollection<Repository, CSRepository> {

    constructor(session: CodeStreamSession) {
        super(session);

        this._disposable = Disposable.from(
            session.onDidChange(this.onSessionChanged, this)
        );
    }

    private onSessionChanged() {
        this.invalidate();
    }

    async getByUri(uri: Uri): Promise<Repository | undefined> {
        const folder = workspace.getWorkspaceFolder(uri);
        if (folder === undefined) return undefined;

        return this._reposByWorkspaceFolder.get(folder);
    }

    private _reposByUri: Map<Uri, Repository> = new Map();
    private _reposByWorkspaceFolder: Map<WorkspaceFolder, Repository> = new Map();

    protected async fetch() {
        const repos = await this.session.api.findOrRegisterRepos();

        this._reposByUri.clear();
        this._reposByWorkspaceFolder.clear();

        const items: Repository[] = [];

        let item;
        for (const [uri, repo] of repos) {
            const folder = workspace.getWorkspaceFolder(uri);

            item = this.map(repo, folder);
            items.push(item);

            this._reposByUri.set(uri, item);
            if (folder !== undefined) {
                this._reposByWorkspaceFolder.set(folder, item);
            }
        }

        return items;
    }

    // protected async getEntitiesOrItems() {
    //     const repos = await this.session.api.getRepos();

    //     const items = [];
    //     try {
    //         const gitRepos = await Git.getRepositories();

    //         this._reposByUri.clear();

    //         let firsts;
    //         let remote: GitRemote | undefined;
    //         for (const gr of gitRepos) {
    //             [firsts, remote] = await Promise.all([
    //                 Git.getFirstCommits(gr.rootUri),
    //                 Git.getRemote(gr.rootUri)
    //             ]);

    //             if (remote === undefined || firsts.length === 0) continue;

    //             const remoteUrl = remote.normalizedUrl;
    //             let repo = repos.find(r => r.normalizedUrl === remoteUrl);
    //             if (repo === undefined) {
    //                 repo = await this.session.api.createRepo(remote.uri, firsts);
    //                 if (repo === undefined) continue;
    //             }

    //             const item = this.mapEntity(repo);
    //             this._reposByUri.set(gr.rootUri, item);
    //             items.push(item);
    //         }
    //     }
    //     catch (ex) {
    //         debugger;
    //     }

    //     return items;
    // }

    protected map(e: CSRepository, folder?: WorkspaceFolder) {
        return new Repository(this.session, e, folder);
    }
}