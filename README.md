# GEMPIRE: Conquest
A web based turn based strategy game played on a hexagonal map

<img width="300" alt="island grid" src="https://github.com/gempireio/strategy-board/assets/74265768/4f016e6f-eb3a-4e69-9548-697627e540a5">

### Game Controls
- Zoom in: Q, Z, +, mouse wheel up, pinch out
- Zoom out: E, X, -, mouse wheel down, pinch in
- Zoom in and center: Double click/tap
- Center selected: C
- Scroll Up: W, UP Arrow
- Scroll Down: S, DOWN Arrow
- Scroll Left: A, LEFT Arrow
- Scroll Right: D, RIGHT Arrow
- Free Scroll: Hold down and drag

### URL/Game Parameters
- l: Hexagon Layers. This determines the size of the map.
- sl: Sea Level (0-255)
- debug: display debug text.
- grid: show grid.

#### Examples
A large map  
<https://gempire.io/tbs/?l=160>

A medium sized map with high sea level  
<https://gempire.io/tbs/?l=85&sl=100>

A smaller medium sized map with grid shown  
<https://gempire.io/tbs/?l=55&grid=1>

A small map with debug  
<https://gempire.io/tbs/?l=25&debug=1>

A very small map with low sea level, debug and grid shown  
<https://gempire.io/tbs/?l=15&sl=20&debug=1&grid=1>



## Features
### Completed 
- [X] Hexognal grid board with neighboring hex tile functions
- [X] Randomly generated land map with elevation values
- [X] Mouse zoom (scroll wheel and double-click)
- [X] Arrow/WASD keys scrolling
- [X] Grab/drag map scrolling
- [X] Keyboard zooming
- [X] Mobile controls
- [X] Hex tile selection

### To-Do
- [ ] UI controls (turn timer, globe button, taskbar)
- [ ] Basic gameplay
- [ ] Movable windows
- [ ] Editable District names
- [ ] Startup Dialog Box
- [ ] Edge of map scrolling
- [ ] Better zooming (smoother fast zoom)
- [ ] Better map generation (distinct mountain ranges, wide plains, islands, etc.)
- [ ] Wrap around map
