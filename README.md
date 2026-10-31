# AlGOL
Game of Life simulation running in the browser. Powered by JavaScript.

https://rayzchen.github.io/algol/

Game of Life is a cellular automata that simulates patterns of cells changing over time. Each cell is either "dead" or "alive".

- If an alive cell has more than 3 alive neighbours it dies of crowding
- If an alive cell has less than 2 alive neighbours it dies of loneliness
- If a dead cell has exactly 3 alive neighbours it becomes alive
- Each frame is then decided based on the state of the previous.

The simulation can be paused, stepped, panned, zoomed, sped up or slowed down.

More about the game can be found at https://conwaylife.com/wiki/
