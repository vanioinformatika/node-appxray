[![Build Status](https://travis-ci.org/vanioinformatika/node-appxray.svg?branch=master)](https://travis-ci.org/vanioinformatika/node-appxray)
[![Coverage Status](https://coveralls.io/repos/github/vanioinformatika/node-appxray/badge.svg)](https://coveralls.io/github/vanioinformatika/node-appxray)
[![NPM Version](https://img.shields.io/npm/v/@vanioinformatika/appxray.svg)](https://www.npmjs.com/package/@vanioinformatika/appxray)

# App Xray

Xray help to monitor service health via health indicators.

The main concept is registering some callback functions which have to return `Promise<any>`. If the returned Promise
resolved than Xray assume that service is up and running correctly, otherwise if the Promise is rejected than service
is marked as down from some reason. Booth resolution and rejection result is saved and can accessed via `status` method.

## Installation

```bash
npm install @vanioinformatika/appxray --save
```

## API

### setInterval

```typescript
setInterval(interval: number): this
```

Set pooling interval. Default interval value is 1000 milliseconds.

### setDefaultIndicatorTimeout

```typescript
setDefaultIndicatorTimeout(timeout: number): this
```

Set default indicator timeout. If timeout is not specified for indicator than default timeout is applied during checking
calling indicator. Default value is 1000 milliseconds.

### setEventEmitter

```typescript
setEventEmitter(eventEmitter: EventEmitter): this
```

Set event emitter to allow firing events. Available events are:

- **xray.started** - Fired after first service check executed.
  - Event's callback sigbature is `(status: IndicatorStatus) => void`.
- **xray.indicator.success** - Fire every time when checking service health for each indicator when it's callback 
  returned resolved promise.
  - Event's callback signature is `(name: string, response: IndicatorResponse) => void`.
- **xray.indicator.error** - Fire like **xray.indicator.success** but only when indicator's callback returned with
  rejected promise.

### has

```typescript
has(name: string): boolean
```

Check if xray has named indicator callback or not.

### add

```typescript
add(name: string, indicator: Indicator, options?: IndicatorOptions): this
```

Add new indicator to xray with given name. During adding indicator it is possible to specify some options:

- **timeout** - Override default indicator timeout. 

> **Note**: Indicator with same name will be overwritten. 

### remove

```typescript
remove(name: string): boolean
```

Remove named indicator from Xray. Return `true` if Xray had named indicator and it is successfully removed, otherwise
its return `false`.

### start

```typescript
start(): void
```

Start pooling indicators with given interval.

> **Note**: It is possible to change timeout and add / remove indicators during pooling.

### status

```typescript
status(): IndicatorStatus
status(name: string): IndicatorResponse
status({detailed}: { detailed: true }): Map<string, IndicatorResponse>
```

Via this method can access last indicator results.

> **Note**: The `status` method returns only actual status. Previous status is always overwritten during checking.

```typescript
status(): IndicatorStatus
```

If status is called without any argument then it will summarize indicators response and returns simple IndicatorStatus
response.

If method is called before pooling is started than it will return `UNKNOWN` status, otherwise `UP` or `DOWN` base on
indicators response. If least one indicator is returned with error then status will result with `DOWN` otherwise `UP`.

```typescript
status(name: string): IndicatorResponse
```

If status is called with single string argument, than it will act like getting information about single indicator. In
this case method will return detailed response.

```typescript
status({detailed}: { detailed: true }): Map<string, IndicatorResponse>
```

The last overload accepts object with options. If `detailed` option is set to true than status is returned in `Map`
where keys are indicator names and values are corresponding detailed responses.

### check

```typescript
check(): Promise<Map<string, IndicatorResponse>>
```

Execute every indicator, update status information base on indicators response. It will return promise with indicators
results.
