import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { getD3Data } from "../console-monkey-patch";

// graph tracks the gain values logged to the console

export default function D3_Graph({ className = "" }) {
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const [data, setData] = useState(() => {
        const initial = getD3Data?.() ?? [];
        return initial.map(parseGain);
    });

    useEffect(() => {
        const handler = (e) => {
        const arr = e?.detail ?? [];
        setData(arr.map(parseGain));
        };

        document.addEventListener("d3Data", handler);

        return () => {
        document.removeEventListener("d3Data", handler);
        };
    }, []);

    useEffect(() => {
        const svgEl = svgRef.current;
        const container = containerRef.current;
        if (!svgEl || !container) return;

        const svg = d3.select(svgEl);
        svg.selectAll("*").remove();

        const bbox = container.getBoundingClientRect();
        const margin = { top: 10, right: 10, bottom: 20, left: 40 };
        const width = Math.max(100, bbox.width - margin.left - margin.right);
        const height = Math.max(60, bbox.height - margin.top - margin.bottom);

        const g = svg
        .attr("width", bbox.width)
        .attr("height", bbox.height)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

        const maxVal = d3.max(data) ?? 1;
        const xScale = d3
        .scaleLinear()
        .domain([0, Math.max(1, data.length - 1)])
        .range([0, width]);

        const yScale = d3.scaleLinear().domain([0, Math.max(1, maxVal)]).range([height, 0]);

        const defs = svg.append("defs");
        const grad = defs
        .append("linearGradient")
        .attr("id", "d3-gradient")
        .attr("x1", 0)
        .attr("x2", 0)
        .attr("y1", 0)
        .attr("y2", 1);

        grad.append("stop").attr("offset", "0%").attr("stop-color", "green");
        grad.append("stop").attr("offset", "100%").attr("stop-color", "red");

        const line = d3
        .line()
        .defined((d) => !isNaN(d))
        .x((d, i) => xScale(i))
        .y((d) => yScale(d))
        .curve(d3.curveMonotoneX);

        g.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "url(#d3-gradient)")
        .attr("stroke-width", 2)
        .attr("d", line);

        const yAxis = d3.axisLeft(yScale).ticks(4);
        g.append("g").attr("class", "y-axis").call(yAxis);

        const xAxis = d3.axisBottom(xScale).ticks(Math.min(6, Math.max(1, data.length - 1)));
        g.append("g").attr("transform", `translate(0,${height})`).call(xAxis);
    }, [data]);

    return (
        <div ref={containerRef} className={className} style={{ width: "100%", height: 200 }}>
        <svg ref={svgRef} style={{ width: "100%", height: "100%" }} className="rounded border" />
        </div>
    );
}

    function parseGain(str) {
    if (!str || typeof str !== "string") return 0;
    const m = str.match(/gain:([0-9]*\.?[0-9]+)/);
    if (!m) return 0;
    const v = Number(m[1]);
    return Number.isFinite(v) ? v : 0;
    }
