/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 * @flow
 * @format
 */

import type {
  DebugBridgeType,
  DebugBridgeFullConfig,
  DebugBridgeConfig,
} from '../types';

import {runCommand} from 'nuclide-commons/process';
import {asyncFind, lastly} from 'nuclide-commons/promise';
import {arrayUnique} from 'nuclide-commons/collection';
import {Observable} from 'rxjs';

export type DBPath = {path: string, priority: number};

class DebugBridgePathStore {
  _registeredPaths: Map<string, DBPath> = new Map();
  _sortedPaths: string[] = [];
  _lastWorkingPath: ?string = null;
  _customPath: ?string = null;
  _port: ?number = null;

  registerPath(id: string, dbPath: DBPath): void {
    this._registeredPaths.set(id, dbPath);
    this._sortedPaths = Array.from(this._registeredPaths.values())
      .sort((a, b) => b.priority - a.priority)
      .map(_dbPath => _dbPath.path);
  }

  getPaths(): string[] {
    const lastWorkingPath = this._lastWorkingPath;
    if (lastWorkingPath == null) {
      return arrayUnique(this._sortedPaths);
    }
    return arrayUnique([lastWorkingPath, ...this._sortedPaths]);
  }

  notifyWorkingPath(workingPath: ?string): void {
    this._lastWorkingPath = workingPath;
  }

  getFullConfig(): DebugBridgeFullConfig {
    return {
      active: this._customPath || this._lastWorkingPath,
      all: this.getPaths(),
      port: this.getPort(),
    };
  }

  registerCustomPath(path: ?string): void {
    if (path != null) {
      this.registerPath('custom', {path, priority: -1});
    }
    this._customPath = path;
  }

  getCustomPath(): ?string {
    return this._customPath;
  }

  setPort(port: ?number) {
    this._port = port;
  }

  getPort(): ?number {
    return this._port;
  }
}

const runningPromises: Map<string, Promise<string>> = new Map();

// Ensure only one call is executed at a time
function reusePromiseUntilResolved(
  id: string,
  cb: () => Promise<string>,
): Promise<string> {
  let runningPromise = runningPromises.get(id);
  if (runningPromise == null) {
    runningPromise = lastly(cb(), () => {
      runningPromises.delete(id);
    });
    runningPromises.set(id, runningPromise);
  }
  return runningPromise;
}

function pathForDebugBridge(db: DebugBridgeType): Promise<string> {
  const store = getStore(db);
  // give priority to custom paths
  const customPath = store.getCustomPath();
  if (customPath != null) {
    return Promise.resolve(customPath);
  }

  return reusePromiseUntilResolved(db, async () => {
    const workingPath = await asyncFind(store.getPaths(), async path => {
      try {
        await runCommand(path, ['start-server']).toPromise();
        return path;
      } catch (e) {
        return null;
      }
    });
    if (workingPath == null) {
      throw new Error(
        `${db} is unavailable. Add it to your path and restart nuclide or make sure that ` +
          `'${db} start-server' works.`,
      );
    }
    store.notifyWorkingPath(workingPath);
    return workingPath;
  });
}

export function createConfigObs(
  db: DebugBridgeType,
): Observable<DebugBridgeConfig> {
  return Observable.defer(() => pathForDebugBridge(db)).map(path => ({
    path,
    port: portForDebugBridge(db),
  }));
}

const pathStore = new Map();

export function getStore(db: DebugBridgeType): DebugBridgePathStore {
  let cached = pathStore.get(db);
  if (cached == null) {
    cached = new DebugBridgePathStore();
    cached.registerPath('default', {path: db, priority: -1});
    pathStore.set(db, cached);
  }
  return cached;
}

export function portForDebugBridge(db: DebugBridgeType): ?number {
  const store = getStore(db);
  return store.getPort();
}
