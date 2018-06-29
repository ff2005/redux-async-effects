export const safeSelector = (select, state) => {
  try {
    return select(state)
  } catch (ex) {}
  return undefined
}

export function createReducer (init, reducers) {
  if (init && reducers) {
    return (state = init, action) => {
      if (action && action.type && reducers[action.type]) {
        return reducers[action.type]({ state, action })
      }
      return state
    }
  }
  return (state, action) => {
    return init
  }
}

export function createEffect (effects, options) {
  if (effects) {
    return (action, getState, select, dispatch, middlewareOptions) => {
      if (action && action.type && effects[action.type]) {
        return effects[action.type]({
          action,
          getState,
          select,
          dispatch,
          options: Object.assign({}, middlewareOptions, options)
        })
      }
    }
  }
  return (action, state, dispatch) => {}
}

export function combineEffects (...effects) {
  if (Array.isArray(effects) && effects.length) {
    return (action, getState, select, dispatch, options) => {
      effects.forEach((effect) => {
        effect && effect(action, getState, select, dispatch, options)
      })
    }
  }
  return (action, state, select, dispatch, options) => {}
}

export default (effect, { log, err, options }) => {
  if (effect) {
    const _log = log || ((...params) => {})
    const _err = err || ((context) => {})
    const _option = options || {}
    const _effect = async (action, store) => {
      try {
        _log('effect', { action })
        await effect(action, store.getState, (selector) => safeSelector(selector, store.getState()), store.dispatch, _option)
      } catch (error) {
        _log('effect', { error, action })
        _err({ error, action })
      }
    }

    return (store) => (next) => (action) => {
      try {
        return next(action)
      } catch (error) {
        _log('action', { error, action })
      } finally {
        _effect(action, store)
      }
    }
  }
  return (store) => (next) => (action) => {}
}

export function mapReduxState (map) {
  return (state, props) => {
    return (
      map({
        getState: () => state,
        select: (selector) => safeSelector(selector, state),
        props
      }) || {}
    )
  }
}

export function mapReduxDispatch (map) {
  return (dispatch) => {
    return map({ dispatch }) || {}
  }
}
