import * as d3 from 'd3';

export interface Options {
    margin?: { top: number; bottom: number; left: number; right: number };
    height?: number;
    width?: number;
    padding?: number;
    waveformType?: 'bars' | 'smooth' | 'sharp';
}

type OnSeekCallback = (newTime: number) => void;

class Drawer {
    private buffer: AudioBuffer;
    private parent: HTMLElement;
    private svg!: d3.Selection<SVGSVGElement, undefined, null, undefined>;
    private options!: Required<Options>;
    private xScale!: d3.ScaleLinear<number, number>;
    private timeScale!: d3.ScaleLinear<number, number>;
    public onSeek?: OnSeekCallback;
    private isDragging = false;

    constructor(buffer: AudioBuffer, parent: HTMLElement) {
        this.buffer = buffer;
        this.parent = parent;
    }

    private getTimeDomain() {
        const step = 30;
        const steps = Math.ceil(this.buffer.duration / step);
        return [...new Array(steps)].map((_, index) => {
            const date = new Date(1970, 0, 1, 0, 0, 0, 0);
            date.setSeconds(index * step);
            return `${date.getMinutes().toString().padStart(2, '0')}:${date
                .getSeconds()
                .toString()
                .padStart(2, '0')}`;
        });
    }

    public generateWaveform(audioData: number[], options: Options) {
        this.options = {
            margin: { top: 20, bottom: 30, left: 20, right: 20 },
            height: this.parent.clientHeight || 400,
            width: this.parent.clientWidth || 800,
            padding: 0.8,
            waveformType: 'bars',
            ...options,
        };

        const { margin, height, width, padding } = this.options;

        this.xScale = d3
            .scaleLinear()
            .domain([0, audioData.length - 1])
            .range([margin.left, width - margin.right]);

        this.timeScale = d3
            .scaleLinear()
            .domain([0, this.buffer.duration])
            .range([margin.left, width - margin.right]);

        this.svg = d3
            .create('svg')
            .attr('width', width)
            .attr('height', height)
            .style('display', 'block');

        const gridGroup = this.svg
            .append('g')
            .attr('stroke-width', 0.5)
            .attr('stroke', '#D6E5D6');

        gridGroup
            .selectAll('line.vertical')
            .data(this.xScale.ticks())
            .join('line')
            .attr('class', 'vertical')
            .attr('x1', (d) => 0.5 + this.xScale(d))
            .attr('x2', (d) => 0.5 + this.xScale(d))
            .attr('y1', 0)
            .attr('y2', height);

        gridGroup
            .selectAll('line.horizontal')
            .data(d3.scaleLinear().domain([0, 1]).ticks())
            .join('line')
            .attr('class', 'horizontal')
            .attr('y1', (d) => {
                const yScale = d3
                    .scaleLinear()
                    .domain([0, 1])
                    .range([height - margin.bottom, margin.top]);
                return yScale(d);
            })
            .attr('y2', (d) => {
                const yScale = d3
                    .scaleLinear()
                    .domain([0, 1])
                    .range([height - margin.bottom, margin.top]);
                return yScale(d);
            })
            .attr('x1', 0)
            .attr('x2', width);

        // Фон для обработки кликов
        const background = this.svg
            .append('rect')
            .attr('width', width)
            .attr('height', height)
            .attr('fill', 'rgba(255,255,255,0)')
            .style('pointer-events', 'all');

        background.on('click', (event: any) => {
            const [x] = d3.pointer(event);
            const newX = Math.max(margin.left, Math.min(x, width - margin.right));
            const newTime = this.timeScale.invert(newX);
            if (this.onSeek) {
                this.onSeek(newTime);
            }
        });

        // Отрисовка вейвформы в зависимости от выбранного режима
        if (this.options.waveformType === 'smooth') {
            this.drawSmoothWaveform(audioData);
        } else if (this.options.waveformType === 'sharp') {
            this.drawSharpWaveform(audioData);
        } else {
            this.drawBarsWaveform(audioData);
        }

        // time
        const timeDomain = this.getTimeDomain();
        const bandScale = d3
            .scaleBand()
            .domain(timeDomain)
            .range([margin.left, width - margin.right]);

        this.svg
            .append('g')
            .attr('transform', `translate(0, ${height - margin.bottom})`)
            .call(d3.axisBottom(bandScale))
            .select('.domain')
            .remove();

        // cursor and him drag logic
        const cursorGroup = this.svg.append('g').attr('class', 'cursor');
        cursorGroup
            .append('line')
            .attr('class', 'cursor-line')
            .attr('x1', margin.left)
            .attr('x2', margin.left)
            .attr('y1', margin.top)
            .attr('y2', height - margin.bottom)
            .attr('stroke', 'red')
            .attr('stroke-width', 2);
        const triangleSize = 10;
        cursorGroup
            .append('path')
            .attr('class', 'cursor-triangle')
            .attr(
                'd',
                d3.symbol().type(d3.symbolTriangle).size(triangleSize * triangleSize)()!
            )
            .attr('fill', 'red')
            .attr('transform', `translate(${margin.left}, ${margin.top - triangleSize})`);

        const drag = d3
            .drag<SVGGElement, undefined>()
            .on('start', () => {
                this.isDragging = true;
            })
            .on('drag', (event) => {
                let newX = event.x;
                newX = Math.max(margin.left, Math.min(newX, width - margin.right));
                cursorGroup.select('.cursor-line').attr('x1', newX).attr('x2', newX);
                cursorGroup
                    .select('.cursor-triangle')
                    .attr('transform', `translate(${newX}, ${margin.top - triangleSize})`);
            })
            .on('end', (event) => {
                this.isDragging = false;
                let newX = event.x;
                newX = Math.max(margin.left, Math.min(newX, width - margin.right));
                const newTime = this.timeScale.invert(newX);
                if (this.onSeek) {
                    this.onSeek(newTime);
                }
            });
        cursorGroup.call(drag);

        return this.svg;
    }

    // Отрисовка классической вейвформы в виде прямоугольных столбцов (bars)
    private drawBarsWaveform(audioData: number[]) {
        const { margin, height, width, padding } = this.options;
        const center = margin.top + (height - margin.top - margin.bottom) / 2;
        const maxBarHeight = (height - margin.top - margin.bottom) / 2;
        const amplitudeScale = d3.scaleLinear().domain([0, 1]).range([0, maxBarHeight]);

        const waveformGroup = this.svg
            .append('g')
            .attr('fill', '#03A300')
            .style('pointer-events', 'none');

        const bandWidth = (width - margin.left - margin.right) / audioData.length;
        waveformGroup
            .selectAll('rect')
            .data(audioData)
            .join('rect')
            .attr('width', bandWidth * padding)
            .attr('x', (_, i) => this.xScale(i))
            .attr('y', (d) => center - amplitudeScale(d))
            .attr('height', (d) => amplitudeScale(d) * 2)
            .attr('rx', bandWidth / 2)
            .attr('ry', bandWidth / 2)
            .attr('fill', '#03A300');

        this.svg
            .append('line')
            .attr('x1', margin.left)
            .attr('x2', width - margin.right)
            .attr('y1', center)
            .attr('y2', center)
            .attr('stroke', '#aaa')
            .attr('stroke-dasharray', '4 2');
    }

    // Отрисовка гладкой вейвформы (smooth) – непрерывная область с плавными кривыми
    private drawSmoothWaveform(audioData: number[]) {
        const { margin, height, width } = this.options;
        const center = margin.top + (height - margin.top - margin.bottom) / 2;
        const maxBarHeight = (height - margin.top - margin.bottom) / 2;
        const amplitudeScale = d3.scaleLinear().domain([0, 1]).range([0, maxBarHeight]);

        const waveformGroup = this.svg.append('g').style('pointer-events', 'none');

        const areaUpper = d3
            .area<number>()
            .x((d, i) => this.xScale(i))
            .y0(center)
            .y1((d) => center - amplitudeScale(d))
            .curve(d3.curveBasis);

        const areaLower = d3
            .area<number>()
            .x((d, i) => this.xScale(i))
            .y0(center)
            .y1((d) => center + amplitudeScale(d))
            .curve(d3.curveBasis);

        const combinedArea = d3
            .area<number>()
            .x((d, i) => this.xScale(i))
            .y0((d) => center + amplitudeScale(d))
            .y1((d) => center - amplitudeScale(d))
            .curve(d3.curveBasis);

        waveformGroup
            .append('path')
            .datum(audioData)
            .attr('d', combinedArea)
            .attr('fill', '#03A300')
            .attr('fill-opacity', 0.2);

        waveformGroup
            .append('path')
            .datum(audioData)
            .attr('d', areaUpper)
            .attr('stroke', '#03A300')
            .attr('stroke-width', 2)
            .attr('fill', 'none');

        waveformGroup
            .append('path')
            .datum(audioData)
            .attr('d', areaLower)
            .attr('stroke', '#03A300')
            .attr('stroke-width', 2)
            .attr('fill', 'none');

        this.svg
            .append('line')
            .attr('x1', margin.left)
            .attr('x2', width - margin.right)
            .attr('y1', center)
            .attr('y2', center)
            .attr('stroke', '#aaa')
            .attr('stroke-dasharray', '4 2');
    }

    // Отрисовка острой вейвформы (sharp) – ромб с острым верхом и низом (точки: левый базовый, верхний пик, правый базовый, нижний пик)
    private drawSharpWaveform(audioData: number[]) {
        const { margin, height, width, padding } = this.options;
        const center = margin.top + (height - margin.top - margin.bottom) / 2;
        const maxBarHeight = (height - margin.top - margin.bottom) / 2;
        const amplitudeScale = d3.scaleLinear().domain([0, 1]).range([0, maxBarHeight]);
        const bandWidth = (width - margin.left - margin.right) / audioData.length;
        const waveformGroup = this.svg.append('g').style('pointer-events', 'none');

        audioData.forEach((d, i) => {
            const colWidth = bandWidth * padding;
            const halfCol = colWidth / 2;
            const xCenter = this.xScale(i);
            const amp = amplitudeScale(d);

            // ромб
            const points = [
                [xCenter - halfCol, center],
                [xCenter, center - amp],
                [xCenter + halfCol, center],
                [xCenter, center + amp]
            ];

            const pathData = `M${points[0][0]},${points[0][1]} L${points[1][0]},${points[1][1]} L${points[2][0]},${points[2][1]} L${points[3][0]},${points[3][1]} Z`;
            waveformGroup.append('path')
                .attr('d', pathData)
                .attr('fill', '#03A300');
        });

        // center line
        this.svg
            .append('line')
            .attr('x1', margin.left)
            .attr('x2', width - margin.right)
            .attr('y1', center)
            .attr('y2', center)
            .attr('stroke', '#aaa')
            .attr('stroke-dasharray', '4 2');
    }

    public updateCursor(currentTime: number) {
        if (this.isDragging) return;
        const { margin, height } = this.options;
        const newX = this.timeScale(currentTime);
        this.svg.select('.cursor-line').attr('x1', newX).attr('x2', newX);
        const triangleSize = 10;
        this.svg
            .select('.cursor-triangle')
            .attr('transform', `translate(${newX}, ${margin.top - triangleSize})`);
    }

    public clearData() {
        const rawData = this.buffer.getChannelData(0);
        const samples = Math.floor(this.buffer.sampleRate / 100);
        const blockSize = Math.floor(rawData.length / samples);
        const filteredData: number[] = [];
        for (let i = 0; i < samples; i++) {
            const blockStart = blockSize * i;
            let sum = 0;
            for (let j = 0; j < blockSize; j++) {
                sum += Math.abs(rawData[blockStart + j]);
            }
            filteredData.push(sum / blockSize);
        }
        const multiplier = Math.max(...filteredData) ** -1;
        return filteredData.map((n) => n * multiplier);
    }

    public init(options?: Options) {
        const audioData = this.clearData();
        const node = this.generateWaveform(audioData, options || {});
        this.parent.innerHTML = '';
        this.parent.appendChild(node.node() as Element);
    }
}

export default Drawer;
