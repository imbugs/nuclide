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

import type {Task} from '../../commons-node/tasks';
import type {TaskMetadata, ToolbarStatePreference} from '../lib/types';
import type {Directory} from '../../nuclide-remote-connection';
import UniversalDisposable from 'nuclide-commons/UniversalDisposable';

import {Subject} from 'rxjs';

type Entry<T> = {key: string, value: T};

export class TaskRunner {
  _taskLists: Subject<Array<TaskMetadata>>;

  id: string;
  name: string;

  constructor(id?: string) {
    this.id = id || 'build-system';
    this.name = id || 'Build System';
    this._taskLists = new Subject();
  }

  getIcon(): ReactClass<any> {
    return ((null: any): ReactClass<any>);
  }

  setProjectRoot(
    projectRoot: ?Directory,
    callback: (enabled: boolean, taskList: Array<TaskMetadata>) => mixed,
  ): IDisposable {
    return new UniversalDisposable();
  }

  runTask(taskName: string): Task {
    return ((null: any): Task);
  }
}

export class ToolbarStatePreferences {
  _db: Array<Entry<?ToolbarStatePreference>>;

  constructor(db: Array<Entry<?ToolbarStatePreference>>) {
    this._db = db;
  }

  getItem(key: string): ?ToolbarStatePreference {
    const entry = this._db[0];
    return entry == null ? null : entry.value;
  }

  getEntries(): Array<Entry<?ToolbarStatePreference>> {
    return this._db;
  }
}

export function createTask(type: string, disabled?: boolean): TaskMetadata {
  return {
    type,
    label: type,
    description: type,
    icon: 'alert',
    disabled,
  };
}
