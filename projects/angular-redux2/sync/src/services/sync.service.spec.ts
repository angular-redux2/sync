/**
 * Import third-party libraries
 */

import { NgRedux } from '@angular-redux2/store';

/**
 * angular-redux2/sync
 */

import { reduxSyncMiddleware, SyncService } from './sync.service';
import { GET_INIT_STATE, RECEIVE_INIT_STATE } from '../interfaces/sync.interface';

/**
 * angular-redux2/sync types
 */

import type { ConfigSyncInterface } from '../interfaces/sync.interface';

jest.mock('@angular-redux2/store');

describe('SyncService', () => {
    let sync: any;
    let ngRedux: NgRedux<any>;
    let mockBroadcastChannel: any;
    let allowedSpy: jest.SpyInstance;

    beforeEach(() => {
        mockBroadcastChannel = {
            onmessage: jest.fn(),
            postMessage: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
        };

        window.BroadcastChannel = jest.fn(() => mockBroadcastChannel);

        ngRedux = new NgRedux();
        sync = new SyncService({
            channelName: 'specTest',
            predicate: jest.fn(),
            whitelist: [ 'ALLOWED_ACTION' ],
            blacklist: [ 'DISALLOWED_ACTION' ]
        });

        (NgRedux as any).store = ngRedux;
        allowedSpy = jest.spyOn(sync, <any>'allowed');
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should initialize state from other tabs', () => {
        const mockEvent = {
            data: { type: RECEIVE_INIT_STATE, payload: { count: 0 } }
        };

        mockBroadcastChannel.addEventListener = ((event: string, func: any) => {
            const messageEvent = new MessageEvent(event, mockEvent);
            func(messageEvent);
        });

        sync.initializeState();

        expect(ngRedux.dispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                type: RECEIVE_INIT_STATE,
                payload: expect.objectContaining({ count: 0 }),
                $isSync: true,
            }),
        );
    });

    describe('constructor', () => {
        test('should create a BroadcastChannel with the specified channelName', () => {
            const settings: ConfigSyncInterface = {
                channelName: 'test-channel',
            };

            const syncInstance: any = new SyncService(settings);
            expect(globalThis.BroadcastChannel).toHaveBeenCalledWith('test-channel');
            expect(syncInstance.channel).toBeDefined();
        });

        test('should call isActionAllowed and bind handleOnMessage to this', () => {
            const syncInstance: any = new SyncService();

            expect(syncInstance.allowed).toBeDefined();
            expect(syncInstance.handleOnMessage).toBeDefined();
            expect(syncInstance.handleOnMessage).toBeInstanceOf(Function);
            expect(syncInstance.handleOnMessage({})).toBeUndefined();
        });

        test('should call initializeState if settings.initState is truthy', () => {
            const settings: ConfigSyncInterface = {
                initState: true,
            };
            const initializeStateSpy = jest.spyOn(SyncService.prototype, <any>'initializeState');
            new SyncService(settings);

            expect(initializeStateSpy).toHaveBeenCalledTimes(1);
        });

        test('should not call initializeState if settings.initState is falsy', () => {
            const settings: ConfigSyncInterface = {
                initState: false,
            };
            const initializeStateSpy = jest.spyOn(SyncService.prototype, <any>'initializeState');
            new SyncService(settings);

            expect(initializeStateSpy).not.toHaveBeenCalled();
        });

        test('should throw an error if the browser does not support cross tab communication', () => {
            (window as any).BroadcastChannel = undefined;

            expect(() => {
                new SyncService();
            }).toThrowError('Your browser doesn\'t support cross tab communication.');
        });

        test('should assign settings to this.settings', () => {
            const settings: ConfigSyncInterface = {
                channelName: 'test-channel',
                initState: true,
            };

            const syncInstance: any = new SyncService(settings);
            expect(syncInstance.settings).toEqual(expect.objectContaining({
                channelName: 'test-channel',
                prepareState: expect.any(Function),
                initState: true,
            }));
        });

        test('should not modify this.settings if no settings are passed in', () => {
            const syncInstance: any = new SyncService();

            expect(syncInstance.settings).toEqual(expect.objectContaining({
                channelName: 'redux_state_sync',
                prepareState: expect.any(Function),
            }));
        });
    });

    describe('handleOnMessage', () => {
        let dispatchSpy: jest.SpyInstance;
        let emitMessageSpy: jest.SpyInstance;

        beforeEach(() => {
            dispatchSpy = jest.spyOn(NgRedux.store, 'dispatch');
            emitMessageSpy = jest.spyOn(sync, 'emitMessage');
        });

        test('should return early if no stampedAction is provided', () => {
            const event = {
                data: null,
            } as MessageEvent;

            sync.handleOnMessage(event);

            expect(emitMessageSpy).not.toHaveBeenCalled();
            expect(dispatchSpy).not.toHaveBeenCalled();
        });

        test('should return early if stampedAction.type is RECEIVE_INIT_STATE', () => {
            const event = {
                data: {
                    type: 'RECEIVE_INIT_STATE',
                },
            } as MessageEvent;

            sync.handleOnMessage(event);

            expect(emitMessageSpy).not.toHaveBeenCalled();
            expect(dispatchSpy).not.toHaveBeenCalled();
        });

        test('should emit RECEIVE_INIT_STATE message if stampedAction.type is GET_INIT_STATE', () => {
            const event = {
                data: {
                    type: GET_INIT_STATE,
                },
            } as MessageEvent;

            const prepareStateResult = { foo: 'bar' };
            jest.spyOn((sync as any).settings, 'prepareState').mockReturnValue(prepareStateResult);

            sync.handleOnMessage(event);

            expect(emitMessageSpy).toHaveBeenCalledWith(expect.objectContaining({
                type: RECEIVE_INIT_STATE,
                payload: prepareStateResult,
            }));
            expect(dispatchSpy).not.toHaveBeenCalled();
        });

        test('should dispatch stampedAction if it is allowed', () => {
            const event = {
                data: {
                    type: 'SOME_ACTION_TYPE',
                    payload: { some: 'data' },
                },
            } as MessageEvent;

            allowedSpy.mockReturnValueOnce(true);

            sync.handleOnMessage(event);

            expect(emitMessageSpy).not.toHaveBeenCalled();
            expect(dispatchSpy).toHaveBeenCalledWith({
                type: 'SOME_ACTION_TYPE',
                payload: { some: 'data' },
                $isSync: true,
            });
        });

        test('should not dispatch stampedAction if it is not allowed', () => {
            const event = {
                data: {
                    type: 'SOME_ACTION_TYPE',
                    payload: { some: 'data' },
                },
            } as MessageEvent;

            allowedSpy.mockReturnValueOnce(false);

            sync.handleOnMessage(event);

            expect(emitMessageSpy).not.toHaveBeenCalled();
            expect(dispatchSpy).not.toHaveBeenCalled();
        });
    });

    describe('emitMessage', () => {
        test('should call postMessage with stampedAction when allowed', () => {
            const action = { $wuid: '1234-1234', type: 'TEST_ACTION' };

            allowedSpy.mockReturnValue(true);
            jest.spyOn(sync, <any>'generateUidForAction').mockReturnValue(action);
            sync.emitMessage({ type: 'TEST_ACTION' });

            expect(allowedSpy).toHaveBeenCalledWith(action);
            expect(mockBroadcastChannel.postMessage).toBeCalledWith(action);
        });

        test('should call postMessage with stampedAction when type is GET_INIT_STATE', () => {
            const stampedAction = { type: GET_INIT_STATE };
            allowedSpy.mockReturnValue(false);

            sync.emitMessage(stampedAction);

            expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith((sync as any).generateUidForAction(stampedAction));
            expect(allowedSpy).toHaveBeenCalledWith((sync as any).generateUidForAction(stampedAction));
        });


        test('should call postMessage with stampedAction when type is RECEIVE_INIT_STATE', () => {
            const stampedAction = { type: RECEIVE_INIT_STATE };
            allowedSpy.mockReturnValue(false);

            sync.emitMessage(stampedAction);

            expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith((sync as any).generateUidForAction(stampedAction));
            expect(allowedSpy).toHaveBeenCalledWith((sync as any).generateUidForAction(stampedAction));
        });

        test('should throw an error when browser does not support postMessage', () => {
            const stampedAction = { type: RECEIVE_INIT_STATE };
            mockBroadcastChannel.postMessage.mockImplementation(() => {
                throw new Error();
            });

            expect(() => sync.emitMessage(stampedAction)).toThrow('Your browser doesn\'t support cross tab communication.');
        });

        test('should not call postMessage when not allowed', () => {
            const stampedAction = { type: 'TEST_ACTION' };
            allowedSpy.mockReturnValue(false);

            sync.emitMessage(stampedAction);

            expect(mockBroadcastChannel.postMessage).not.toHaveBeenCalled();
        });
    });

    describe('isActionAllowed', () => {
        test('should return a function that always returns true if no settings are provided', () => {
            const instance: any = new SyncService();
            const allowed = instance.isActionAllowed();

            const action = { type: 'SOME_ACTION' };
            expect(allowed(action)).toBe(true);
        });

        test('should return a function that uses the provided predicate if it is a function', () => {
            const predicate = jest.fn((action: any) => action.type !== 'BLACKLISTED_ACTION');
            const settings = { predicate };
            const instance: any = new SyncService(settings);
            const allowed = instance.isActionAllowed();

            const allowedAction = { type: 'ALLOWED_ACTION' };
            expect(allowed(allowedAction)).toBe(true);

            const blacklistedAction = { type: 'BLACKLISTED_ACTION' };
            expect(allowed(blacklistedAction)).toBe(false);

            expect(predicate).toHaveBeenCalledTimes(2);
            expect(predicate).toHaveBeenCalledWith(allowedAction);
            expect(predicate).toHaveBeenCalledWith(blacklistedAction);
        });

        test('should return a function that allows all actions not in the blacklist array', () => {
            const blacklist = [ 'BLACKLISTED_ACTION_1', 'BLACKLISTED_ACTION_2' ];
            const settings = { blacklist };
            const instance: any = new SyncService(settings);
            const allowed = instance.isActionAllowed();

            const allowedAction = { type: 'ALLOWED_ACTION' };
            expect(allowed(allowedAction)).toBe(true);

            const blacklistedAction1 = { type: 'BLACKLISTED_ACTION_1' };
            expect(allowed(blacklistedAction1)).toBe(false);

            const blacklistedAction2 = { type: 'BLACKLISTED_ACTION_2' };
            expect(allowed(blacklistedAction2)).toBe(false);
        });

        test('should return a function that only allows actions in the whitelist array', () => {
            const whitelist = [ 'ALLOWED_ACTION_1', 'ALLOWED_ACTION_2' ];
            const settings = { whitelist };
            const instance: any = new SyncService(settings);
            const allowed = instance.isActionAllowed();

            const allowedAction1 = { type: 'ALLOWED_ACTION_1' };
            expect(allowed(allowedAction1)).toBe(true);

            const allowedAction2 = { type: 'ALLOWED_ACTION_2' };
            expect(allowed(allowedAction2)).toBe(true);

            const notAllowedAction = { type: 'NOT_ALLOWED_ACTION' };
            expect(allowed(notAllowedAction)).toBe(false);
        });
    });

    describe('reduxSyncMiddleware', () => {
        let middleware: ReturnType<typeof reduxSyncMiddleware>;
        let spyEmitMessage: jest.SpyInstance;

        beforeEach(() => {
            spyEmitMessage = jest.spyOn(SyncService.prototype, 'emitMessage');
            middleware = reduxSyncMiddleware();
        });

        it('should call emitMessage when action is dispatched', () => {
            const action = { type: 'SOME_ACTION' };
            const next = jest.fn();
            spyEmitMessage.mockReturnValue(true);

            middleware(null, action, next);

            expect(spyEmitMessage).toHaveBeenCalledWith(action);
            expect(next).toHaveBeenCalledWith(null, {
                ...action,
                $isSync: false,
            });
        });

        it('should call emitMessage with GET_INIT_STATE when initState is true', () => {
            middleware = reduxSyncMiddleware({ initState: true });

            expect(spyEmitMessage).toHaveBeenCalledWith({
                type: GET_INIT_STATE,
            });
        });

        it('should call next with RECEIVE_INIT_STATE action', () => {
            const state = {};
            const action = { type: 'xxx', payload: { some: 'state' } };
            const next = jest.fn();

            middleware(state, action, next);

            expect(next).toHaveBeenCalledWith(state, { type: 'xxx', $isSync: false, payload: { some: 'state' } });
        });

        it('should call next with modified action', () => {
            const state = {};
            const action = { type: 'SOME_ACTION' };
            const next = jest.fn();

            middleware(state, action, next);

            expect(next).toHaveBeenCalledWith(state, {
                ...action,
                $isSync: false,
            });
        });
    });
});
