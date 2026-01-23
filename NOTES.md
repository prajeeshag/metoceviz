# Architecture

- A vizualization is composed using different components.
- A component is an immutable object that represents a part of the visualization.
- Component can be a visual element or other things like data, interpolator, projections etc.
- A component itself can be composed of other components.

## Component

- An abstract class that represents a component.
- Components are immutable.
- Components should override toString method to make it safe and deterministic json string.
- Components properties should be immutable.
- Components properties should be either primitive types, immutable tuples, or another Component.

## Provider

- Provider is responsible for creating components.
- Provider should accept the same parameters as the component constructor and an agent.
- Provider should return a Promise of component instance.
- Provider should be able to cache the response.
- Provider is called by an Agent.
- Provider should be able to handle multiple Agents.
- Only one request per Agent should be processed at a time.
- When a new request comes in:
  - If the same request is already in progress, return the same promise.
  - If the same request in cache, return the cached response.
  - If a different request is already in progress, abort the previous request and start a new one.

## Agent

- Agent takes in request, calls Provider to create a component and returns a Promise of component instance.





## Random ideas

- Dataset describes the data and its attributes:
  - Variables
  - Vector variable pairs
  - time and level information
  - short name, standard name, long name, units, descriptions
  - default settings for each variable: colormap, levels
  - default settings for the dataset: projection

