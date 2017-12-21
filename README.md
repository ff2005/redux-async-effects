redux-async-effects

# WIP: This is still a work in progress and it's not tested on production environment. Please be patient.

## What is this?

The objective of this lib is to provide async / await (or in another words - promise) to handle Redux side effect in a simple and clean way.

It is a middleware for Redux, with some helpers for making the reducer, side-effect, actions and selector.

I developed this lib for React Native use, but, should work as any other redux side effect lib.

## Installation

Just run:

```
npm install --save ff2005/redux-async-effects
```

# Example

### /Store/index.js
```js
/* @flow */

import { createStore, applyMiddleware, compose } from 'redux'
import createAsyncEffectMiddleware from 'redux-async-effects'
import effectLogger from 'redux-async-effects-logger'
import { persistStore } from 'redux-persist'
import { createLogger } from 'redux-logger'

import { ApplicationAction } from '../Redux/ApplicationRedux'

export default (rootReducer: Function, rootEffects: Function) => {
  const middleware = []
  const enhancers = []
  const reducers = (state: any = {}, action: any) => {
    return (rootReducer(state, action))
  }

  if (__DEV__) {
    middleware.push(createLogger())
  }

  middleware.push(createAsyncEffectMiddleware(rootEffects, {
    log: __DEV__ ? effectLogger : undefined,
    err: ({ error, action }) => {
      console.log('err', error, action)
    },
    options: {
      var1: 'var1'
    }
  }))

  enhancers.push(applyMiddleware(...middleware))

  const store = createStore(reducers, undefined, compose(...enhancers))

  persistStore(store, undefined, () => {
    store.dispatch(ApplicationAction.start())
  })

  return (store)
}
```

### /Redux/index.js
```js
/* @flow */

import { persistCombineReducers } from 'redux-persist'
import storage from 'redux-persist/es/storage'
import { combineEffects } from 'redux-async-effects'
import createStore from '../Store'

import { ApplicationAction, ApplicationSelector, ApplicationReducer, ApplicationEffect } from './ApplicationRedux'
export { ApplicationAction, ApplicationSelector }

const config = {
  debug: __DEV__,
  key: 'FindTheObject',
  storage,
  blacklist: ['application'],
  version: 1.1
}

export default () => {
  const rootReducer = persistCombineReducers(config, {
    action: (state = null, { type }) => (type),
    application: ApplicationReducer
  })

  const rootEffects = combineEffects(
    ApplicationEffect
  )

  return createStore(rootReducer, rootEffects)
}
```

### /Redux/ApplicationRedux.js
```js
/* @flow */

import Immutable from 'seamless-immutable'
import { createReducer, createEffect } from 'redux-async-effects'
import { startup, increment } from '../Effects/ApplicationEffect'

const NS = 'application'

type ApplicationState = {
  started: boolean,
  inc: Object
}

const APPLICATION_INIT_STATE: ApplicationState = Immutable({
  started: false,
  inc: {}
})

export const ApplicationTypes = {
  START: `${NS}/START`,
  INCREMENT: `${NS}/INCREMENT`,
  INCREMENT_SUCCESS: `${NS}/INCREMENT_SUCCESS`
}

export const ApplicationSelector = {
  inc: (index: string) => (state: Object) => (state.application.inc[index] || 0)
}

export const ApplicationAction = {
  start: () => ({ type: ApplicationTypes.START }),
  increment: (index: string) => ({ type: ApplicationTypes.INCREMENT, index })
}

export const ApplicationReducer = createReducer(APPLICATION_INIT_STATE, {
  [ApplicationTypes.START]: ({ action, state }) => (state.merge({ started: true })),
  [ApplicationTypes.INCREMENT_SUCCESS]: ({ action, state }) => {
    const index = action.index
    const increment = action.inc
    const inc = state.inc.asMutable()
    inc[index] = increment
    return (state.merge({ inc }))
  }
})

export const ApplicationEffect = createEffect({
  [ApplicationTypes.START]: startup,
  [ApplicationTypes.INCREMENT]: increment
})
```

### /Effects/ApplicationEffect.js
```js
/* @flow */

import type { Effect } from 'redux-async-effects'
import { ApplicationTypes, ApplicationAction, ApplicationSelector } from '../Redux/ApplicationRedux'

export const startup = async ({ dispatch }: Effect) => {
  const a = await delay(3000)
  if (a) {
    for (let i = 0; i < 100; i++) {
      dispatch(ApplicationAction.increment('A'))
      dispatch(ApplicationAction.increment('B'))
      dispatch(ApplicationAction.increment('C'))
    }
  }
}

export const increment = async ({ action, select, dispatch }: Effect) => {
  const index: string = action.index
  const a = await delay(1000)
  if (a) {
    const inc: number = select(ApplicationSelector.inc(index)) + 1
    dispatch({ type: ApplicationTypes.INCREMENT_SUCCESS, index, inc })
    const a = await delay(1000)
    if (a) {
      const inc: number = select(ApplicationSelector.inc(index)) + 1
      dispatch({ type: ApplicationTypes.INCREMENT_SUCCESS, index, inc })
    }
  }
}

const delay = (timeout: number = 1000) => new Promise((resolve) => {
  if (timeout > 0) {
    setTimeout(() => {
      resolve(true)
    }, timeout)
  } else {
    resolve(true)
  }
})
```

### My React Native Component
```js
/* @flow */

import React, { Component } from 'react'
import { View, Text, Platform, StyleSheet } from 'react-native'
import { connect } from 'react-redux'
import { mapReduxState, mapReduxDispatch } from 'redux-async-effects'
import { ApplicationSelector, ApplicationAction } from '../Redux'

const instructions = Platform.select({
  ios: 'Press Cmd+R to reload,\n' +
    'Cmd+D or shake for dev menu',
  android: 'Double tap R on your keyboard to reload,\n' +
    'Shake or press menu button for dev menu'
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF'
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5
  }
})

type Props = {
  incA: number,
  incB: number,
  incC: number,
  incrementB: Function,
  incrementC: Function
}

class ScreenA extends Component<Props> {
  /* */

  static mapReduxStateToProps = mapReduxState(({ select }) => ({
    incA: select(ApplicationSelector.inc('A')),
    incB: select(ApplicationSelector.inc('B')),
    incC: select(ApplicationSelector.inc('C'))
  }))

  static mapReduxDispatchToProps = mapReduxDispatch(({ dispatch }) => ({
    incrementB: () => dispatch(ApplicationAction.increment('B')),
    incrementC: () => dispatch(ApplicationAction.increment('C'))
  }))

  componentWillReceiveProps (newProps: Object) {
    if (this.props && newProps) {
      if (this.props.incA !== newProps.incA && this.props.incrementB) {
        this.props.incrementB()
        this.forceUpdate()
      }
      if (this.props.incB !== newProps.incB && this.props.incrementC) {
        this.props.incrementC()
        this.forceUpdate()
      }
      if (this.props.incC !== newProps.incC) {
        this.forceUpdate()
      }
    }
  }

  render () {
    return (
      <View style={styles.container}>
        <Text style={styles.welcome}>
          Welcome to React Native!
        </Text>
        <Text style={styles.instructions}>
          To get started, edit App.js
        </Text>
        <Text style={styles.instructions}>
          { this.props.incA } : { this.props.incB } : { this.props.incC }
        </Text>
        <Text style={styles.instructions}>
          { instructions }
        </Text>
      </View>
    )
  }
}

export default connect(ScreenA.mapReduxStateToProps, ScreenA.mapReduxDispatchToProps)(ScreenA)
```

## License

MIT