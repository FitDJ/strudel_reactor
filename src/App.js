import './App.css';
import { useEffect, useRef, useState } from "react";
import { StrudelMirror } from '@strudel/codemirror';
import { cpm, evalScope, set } from '@strudel/core';
import { drawPianoroll } from '@strudel/draw';
import { initAudioOnFirstClick } from '@strudel/webaudio';
import { transpiler } from '@strudel/transpiler';
import { getAudioContext, webaudioOutput, registerSynthSounds } from '@strudel/webaudio';
import { registerSoundfonts } from '@strudel/soundfonts';
import { stranger_tune } from './tunes';
import console_monkey_patch, { getD3Data } from './console-monkey-patch';

import DJ_Controls from './components/DJ_Controls';
import Play_Buttons from './components/Play_Buttons';
import PreProcText from './components/PreProcText';
import { preProcess } from './utils/preProcessLogic';
import { toggleSectionPrefix } from './utils/MuteLogic';
import { startPlayback, stopPlayback } from './services/PlaybackServices';

let globalEditor = null;

const handleD3Data = (event) => {
    console.log(event.detail);
};

export default function StrudelDemo() {

    const hasRun = useRef(false);
    
    const [procText, setProcText] = useState(stranger_tune);
    const [volume, setVolume] = useState(1);
    const [state, setState] = useState("stop");
    const [cpmError, setCpmError] = useState(false);


    const handlePlay = () => {
        startPlayback(globalEditor, procText, volume, preProcess);
    }

    const handleToggle = (e) => {
        const { id, checked } = e.target;


        setProcText(prev => {
            const newText = toggleSectionPrefix(prev, id, checked);

            if (state === "play" && globalEditor) {
                handlePlay();
            }

        return newText
    });
    };

    const handleSetCpm = (e) => {
        const value = e.target.valueAsNumber;
        if (isNaN(value)|| value <= 0) { // invalid CPM
            setCpmError(true);
            return;
        }

        // valid CPM, hide alert
        setCpmError(false);

        // Update procText only, playback will pick it up when next Play is clicked
        setProcText(prev => prev.replace(/setcps\([^)]+\)/, `setcps(${value}/60/4)`));
    };

    useEffect(() => {

        if (state === "play") {
            handlePlay();
        }
    }, [volume])

    useEffect(() => {

        if (!hasRun.current) {
            document.addEventListener("d3Data", handleD3Data);
            console_monkey_patch();
            hasRun.current = true;
            //Code copied from example: https://codeberg.org/uzu/strudel/src/branch/main/examples/codemirror-repl
            //init canvas
            const canvas = document.getElementById('roll');
            canvas.width = canvas.width * 2;
            canvas.height = canvas.height * 2;
            const drawContext = canvas.getContext('2d');
            const drawTime = [-2, 2]; // time window of drawn haps
            globalEditor = new StrudelMirror({
                defaultOutput: webaudioOutput,
                getTime: () => getAudioContext().currentTime,
                transpiler,
                root: document.getElementById('editor'),
                drawTime,
                onDraw: (haps, time) => drawPianoroll({ haps, time, ctx: drawContext, drawTime, fold: 0 }),
                prebake: async () => {
                    initAudioOnFirstClick(); // needed to make the browser happy (don't await this here..)
                    const loadModules = evalScope(
                        import('@strudel/core'),
                        import('@strudel/draw'),
                        import('@strudel/mini'),
                        import('@strudel/tonal'),
                        import('@strudel/webaudio'),
                    );
                    await Promise.all([loadModules, registerSynthSounds(), registerSoundfonts()]);
                },
            });

            document.getElementById('proc').value = procText
            globalEditor.setCode(procText);
        }
    }, [procText]);


    return (
        <div className="container-fluid py-3" >
            <h2 className="text-center mb-4">Strudel Demo React Assignment 2</h2>
            
                {/* Top Row: Preprocess Text */}
                <div className="row mb-3">
                    <div className="col-md-12">
                        <div className="card">
                            <div className="card-header">Song Preprocessing</div>
                            <div className="card-body">
                                <PreProcText
                                    defaultValue={procText}
                                    onChange={(e) => setProcText(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Middle Row: Playback Controls | D3 Graph | DJ Controls */}
                <div className="row mb-3">
                    {/* Playback Controls */}
                    <div className="col-md-4 mb-3">
                        <div className="card">
                            <div className="card-header">Playback Controls</div>
                            <div className="card-body d-flex flex-column gap-2">
                                <Play_Buttons
                                    onPlay={() => { 
                                        setState("play"); 
                                        handlePlay()
                                    }}
                                    onStop={() => { 
                                        setState("stop"); 
                                        stopPlayback(globalEditor);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                    
                    {/* D3 Graph */}
                    <div className="col-md-4 mb-3">
                        <div className="card">
                            <div className="card-header">D3 Graph</div>
                            <div className="card-body" style={{ minHeight: "200px" }}>
                                <div id="d3Graph">
                                    
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* DJ Controls */}
                    <div className="col-md-4 mb-3">
                        <div className="card">
                            <div className="card-header">DJ Controls</div>
                            <div className="card-body">
                                <DJ_Controls
                                    volume={volume}
                                    onVolumeChange={(e) => setVolume(e.target.value)}
                                    onToggle={handleToggle}
                                    onSetCpm={handleSetCpm}
                                    cpmError={cpmError}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                    <div className="container-fluid">
                        <div className="row">
                            
                            
                        <div className="row">
                            <div className="col-md-8" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                                <div id="editor" />
                                <div id="output" />
                            </div>
                        </div>
                    </div>
                    <canvas id="roll"></canvas>
            </div >
        </div >
    );
}