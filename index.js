/* @flow */

export type Redux = {
  dispatch: Function,
  getState: () => Object
}

export type Selector = (state: Object) => any

export const safeSelector = (select: Selector, state: Object = {}) => {
  try {
    return (select(state))
  } catch (ex) {}
  return (undefined)
}

export type Middleware = {
  log?: Function,
  err?: Function,
  options?: Object
}

export type Effect = {
  action: Object,
  getState: Function,
  select: Function,
  dispatch: Function,
  options: Object
}

export type EffectFunction = (action: Object, getState: Function, select: Function, dispatch: Function, options: Object) => void | Function | Promise<void>

export type ReducerFunction<State> = (state: State, action: Object) => State

export function createReducer<State: Object> (init: State, reducers: Object): ReducerFunction<State> {
  if (init && reducers) {
    return (state: State = init, action: Object) => {
      if (action && action.type && reducers[action.type]) {
        return (reducers[action.type]({ state, action }))
      }
      return (state)
    }
  }
  return (state: any, action: any) => {
    return (init)
  }
}

export function createEffect (effects: Object, options: Object = {}): EffectFunction {
  if (effects) {
    return (action: Object, getState: Function, select: Function, dispatch: Function, middlewareOptions: Object) => {
      if (action && action.type && effects[action.type]) {
        return (effects[action.type]({
          action,
          getState,
          select,
          dispatch,
          options: Object.assign({}, middlewareOptions, options)
        }))
      }
    }
  }
  return (action: any, state: any, dispatch: any) => {}
}

export function combineEffects (...effects: Array<EffectFunction>) {
  if (Array.isArray(effects) && effects.length) {
    return (action: Object, getState: Function, select: Function, dispatch: Function, options: Object) => {
      effects.forEach((effect: EffectFunction) => {
        effect && effect(action, getState, select, dispatch, options)
      })
    }
  }
  return (action: any, state: any, select: any, dispatch: any, options: any) => {}
}

export default (effect: EffectFunction, { log, err, options }: Middleware = {}) => {
  if (effect) {
    const _log = log || ((...params: any): void => {})
    const _err = err || ((context: Object): void => {})
    const _option = options || {}
    const _effect = async (action: Object = {}, store: Redux): Promise<void> => {
      try {
        _log('effect', { action })
        await effect(action, store.getState, (selector: Selector) => (safeSelector(selector, store.getState())), store.dispatch, _option)
      } catch (error) {
        _log('effect', { error, action })
        _err({ error, action })
      }
    }

    return (store: Redux) => (next: Function) => (action: Object) => {
      try {
        return (next(action))
      } catch (error) {
        _log('action', { error, action })
      } finally {
        _effect(action, store)
      }
    }
  }
  return (store: Redux) => (next: Function) => (action: Object) => {}
}

export function mapReduxState (map: Function) {
  return (state: Object, props: Object) => {
    return map({
      getState: () => (state),
      select: (selector: Selector) => (safeSelector(selector, state)),
      props
    }) || {}
  }
}

export function mapReduxDispatch (map: Function) {
  return (dispatch: Function) => {
    return map({ dispatch }) || {}
  }
}

