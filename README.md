# angular-redux2/sync
Angular-redux2-sync is a lightweight middleware for synchronizing the Redux state between different tabs/windows in the same browser.
It uses the Broadcast Channel API to communicate with other tabs and dispatches the same actions that were dispatched in other tabs to keep the state in sync.

[![Discord](https://img.shields.io/discord/1050521693795405874?logo=Angular-redux2)](https://discord.com/invite/7BnsAqst6W)
[![npm version](https://img.shields.io/npm/v/@angular-redux2/sync.svg)](https://www.npmjs.com/package/@angular-redux2/sync)
[![downloads per month](https://img.shields.io/npm/dm/@angular-redux2/sync.svg)](https://www.npmjs.com/package/@angular-redux2/sync)

## Installation
You can install angular-redux2/sync using npm:
```bash
npm install @angular-redux2/sync
```

## Usage
To use angular-redux2/sync, you need to create an instance of the SyncService class and add it to your Reducer middleware chain.
- Take me to the [API docs](https://angular-redux2.github.io/sync).
```typescript
ngRedux.configureStore(<any>rootReducer, INITIAL_STATE, [
    reduxSyncMiddleware({ initState: true })
], enhancer);
```

The `SyncService` constructor takes an optional `ConfigSyncInterface` object that can be used to customize the behavior of the `synchronization`.
Here are the available options:

* `channelName` (optional): The name of the communication channel to use for action synchronization. If not specified, a default value of "redux-sync" will be used.
* `initState` (optional): A boolean flag indicating whether to copy the initial state from another tab (if available). If set to true, an initial state request will be sent to other tabs through the communication channel.
* `blacklist` (optional): An array of actions that will not be triggered in other tabs. If an action matches any of the types in this array, it will not be synchronized with other tabs.
* `whitelist` (optional): An array of actions that will be triggered in other tabs. If this array is specified, only actions that match the types in this array will be synchronized with other tabs.
* `predicate` (optional): A function that can be used to filter the actions to be synchronized based on custom criteria. This function takes an action object as its parameter and should return a boolean value indicating whether the action should be synchronized.
* `prepareState` (optional): A function that can be used to prepare the initial state for synchronization with other tabs. This function takes an action object as its parameter and should return the modified initial state object.

> Note that when using multiple options (`predicate`, `blacklist`, and `whitelist`), only one of them will be effective.
> The priority is `predicate` > `blacklist` > `whitelist`.
