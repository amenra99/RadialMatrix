var radialMatrix = {
    svgNS: 'http://www.w3.org/2000/svg',
    signals: {
    	NER_SELECTED: 'ner_selected',
        DOC_SELECTED: 'doc_selected',
        DOC_CLICKED: 'doc_clicked',
        SIM_DOC_SELECTED: 'sim_doc_selected',
    	SIM_MOUSEOUT: 'sim_mouseout',
        SIM_DOC_CLICKED: 'sim_doc_clicked',
        SLIDER_CHNAGED: 'slider_changed'
    },
    tags: {
        PER: 'I-PER',
        LOC: 'I-LOC',
        ORG: 'I-ORG'
    },
    colors: {
        PER: 'Orchid', // 'MediumVioletRed ', // 243 182 112 Orchid 
        LOC: 'DarkGoldenRod', //'MidnightBlue ',    //138 177 208 DarkGoldenRod
        ORG: 'MediumSeaGreen' //'Olive'    //188 219 121  MediumSeaGreen 
    },
    radialMargin: { outer:80, inner:100, arc:1 },
    curveMargin: 20,
    nerPoint: {
        min: 10,
        max: 50,
        normalWidth: 2,
        selectedWidth: 5,
    },
    docPath: {
        normalWidth: 1,
        selectedWidth: 2,
        selectedColor: 'black',
        minAlpha: 0.3,
        maxAlpha: 0.8,
        simSelectedColor: 'black',
        simSelectedWidth: 1.5,
    },
    point: {
        normal_radius: 5,
        selected_radius: 8,
        clicked_radius: 12,
        stroke_color: 'black',
        selected_stroke_width: '2px',
        clicked_stroke_width: '1px',
        clicked_color: 'red'
    },
    ner_range: {
        min: 2,
        max: 13,
        current_min: 3,
        current_max: 13,
    },
    selectedOpacity: 0.1,
};


var model = null;
var controller = null;

window.addEventListener('load', function () {
    // model = createModel(nerData, docs, sims, textData);
    // controller = createController(model);

    initialize();

    var selections = createSelectionView('slider-range', model);
    selections.register(controller.dispatch);
    // model.register(selections.render);
    selections.render();
});

var initialize = function() {
    // var model = createModel(nerData, docs, sims, textData);
    // var controller = createController(model);
    model = createModel(nerData, docs, sims, textData);
    controller = createController(model);

    var radial = createRadialMatrixView('view', model);
    radial.register(controller.dispatch);

    model.register(radial.render);
    radial.render();
    
    // var selections = createSelectionView(model);
    // selections.register(controller.dispatch);
    // // model.register(selections.render);
    // selections.render();

    var textView = createTextView('textView', model);
    textView.register(controller.dispatch);
    model.register(textView.render);
    textView.render();

}


// This is the makeSignaller from class
var makeSignaller = function() {
    var _subscribers = []; // Private member

    // Return the object that's created
    return {
	// Register a function with the notification system
	add: function(handlerFunction) { _subscribers.push(handlerFunction); },

	// Loop through all registered function snad call them with passed
	// arguments
	notify: function(args) {
	    for (var i = 0; i < _subscribers.length; i++) {
		_subscribers[i](args);
	    }
	}
    };
}

// Create an object that handles UI object
var createController = function(model) {
    var _model = model;

    return {
	// All types of events run through a central dispatch
	// function. The dispatch function decides what to do.
	dispatch: function(evt) {
	    switch(evt.type) {
            // mouser over event
		    case radialMatrix.signals.NER_SELECTED:
                model.ner_selected(evt.id);
		    	break;
            case radialMatrix.signals.DOC_SELECTED:
                model.doc_selected(evt.id);
                break;
            case radialMatrix.signals.DOC_CLICKED:
                model.doc_clicked(evt.id);
                console.log('doc: ' + evt.id);
                break;
            case radialMatrix.signals.SIM_DOC_SELECTED:
                model.sim_doc_selected(evt.id);
                break;
            case radialMatrix.signals.SIM_DOC_CLICKED:
                model.sim_doc_clicked(evt.id);
                console.log('sim: ' + evt.id);
                break;
		    case radialMatrix.signals.SIM_MOUSEOUT:
                model.sim_mouseout();
		    	break;
            // slider value changed envent
            case radialMatrix.signals.SLIDER_CHNAGED:
                // model.silder_changed(evt.min, evt.max);
                radialMatrix.ner_range.current_min = evt.min;
                radialMatrix.ner_range.current_max = evt.max;
                initialize();
                break;
			default:
			    console.log('Unknown event type', evt.type);
	    }
	}
    };
}

var createModel = function(nerData, docData, sims, textData) {
    var _observers = makeSignaller();
    
    var _nerData = nerData;
    var _docData = docData;
    var _simData = sims;
    var _textData = textData;

    var _nerDic = {};

    var _selectedNerId = -1;
    var _selectedObj = null;
    var _selectedLabels = {};
    var _selectedDocs = [];
    var _nerPaths = [];
    var _selectedSimPath = [];
    
    var _selectedSimId = -1;
    var _selectedSimNERPaths = [];
    var _selectedSimNERLabels = {};

    var _selectedDocId = -1;

    var _persons = [];
    var _locations = [];
    var _organizations = [];

    var _texts = [];

    var _personScale = d3.scaleBand().range([150 + radialMatrix.radialMargin.arc, 270 - radialMatrix.radialMargin.arc]);
    var _locScale = d3.scaleBand().range([270 + radialMatrix.radialMargin.arc, 390 - radialMatrix.radialMargin.arc]);
    var _orgScale = d3.scaleBand().range([30 + radialMatrix.radialMargin.arc, 150 - radialMatrix.radialMargin.arc]);
    var _colorScale = d3.scaleOrdinal()
        .domain([radialMatrix.tags.PER, radialMatrix.tags.LOC, radialMatrix.tags.ORG])
        .range([radialMatrix.colors.PER, radialMatrix.colors.LOC, radialMatrix.colors.ORG]);
    var _nerSizeScale = d3.scaleSqrt().range([radialMatrix.nerPoint.min, radialMatrix.nerPoint.max]);
    
    var _nerPathAlphaScale = d3.scaleLinear()
        .domain([radialMatrix.ner_range.min, radialMatrix.ner_range.max])
        .range([radialMatrix.docPath.minAlpha, radialMatrix.docPath.maxAlpha]);
    
    var _docScale = d3.scaleLinear()
        .domain([0, _docData.length]);

    var _setScale = function(innerR) {
        var _pIds = [];
        var _lIds = [];
        var _oIds = [];
        var _sizes = [];

        for (var i=0; i<_nerData.length; i++ ) {
            var item = _nerData[i];
            if (item.size >= radialMatrix.ner_range.current_min && item.size <= radialMatrix.ner_range.current_max) {
                _sizes.push(item.size)
                switch (item.tag) {
                    case radialMatrix.tags.PER :
                        _pIds.push(item.word);
                        break;
                    case radialMatrix.tags.LOC :
                        _lIds.push(item.word);
                        break;
                    case radialMatrix.tags.ORG :
                        _oIds.push(item.word);
                        break;
                    default:
                        console.log('Wrong tag name:' + item['tag']);
                        break;
                }
            }
        }

        _personScale.domain(_pIds);
        _locScale.domain(_lIds);
        _orgScale.domain(_oIds);

        _nerSizeScale.domain([d3.min(_sizes), d3.max(_sizes)]);

        var _tringleLen = 2 * innerR * sin(toRadians(60));
        _docScale.range([0, _tringleLen])

        // console.log(_personScale.domain());
        // console.log(_personScale.range());
    }

    // get Angles by ner types
    var _getAngle = function(id, word, tag, freq) {
        var _angle = -1;

        if (tag == radialMatrix.tags.PER) {
            _angle = _personScale(word);
            _persons.push({
                'id': id,
                'word': word,
                'freq': freq
            })
        }
        else if (tag == radialMatrix.tags.LOC) {
            _angle = _locScale(word);
            _locations.push({
                'id': id,
                'word': word,
                'freq': freq
            })
        }
        else if (tag == radialMatrix.tags.ORG) {
            _angle = _orgScale(word);
            _organizations.push({
                'id': id,
                'word': word,
                'freq': freq
            })
        }

        return _angle;
    }

    // ner data
    var _getNerData = function(cx, cy, r) {
        var tmpObjs = [];

        for (var i=0; i<_nerData.length; i++) {
            if (_nerData[i].size >= radialMatrix.ner_range.current_min && _nerData[i].size <= radialMatrix.ner_range.current_max ) {
                var _size = _nerSizeScale(_nerData[i].size);
                var _angle = _getAngle(i, _nerData[i].word, _nerData[i].tag, _nerData[i].size);

                var _pos = gerRtoXY(cx, cy, r, _angle);
                var _pos2 = gerRtoXY(cx, cy, r + _size, _angle);    // bar height
                var _pos3 = gerRtoXY(cx, cy, r - radialMatrix.curveMargin, _angle);    // sub point for handling edge crossing
                var _pos4 = gerRtoXY(cx, cy, r + radialMatrix.nerPoint.max/2, _angle);    // center of the max bar..
                var _obj = {
                    'id': i,
                    'cx': _pos.x,
                    'cy': _pos.y,

                    'r': _size,
                    'tag': _nerData[i].tag,
                    'angle': _angle,
                    'color': _colorScale(_nerData[i].tag),
                    'word': _nerData[i].word,
                    'freq': _nerData[i].size,

                    'cx2': _pos2.x,
                    'cy2': _pos2.y,

                    'innerX': _pos3.x,
                    'innerY': _pos3.y,

                    'centerX': _pos4.x,
                    'centerY': _pos4.y,

                    'width': radialMatrix.nerPoint.normalWidth
                };

                if ( i == _selectedNerId) {
                    _obj.width = radialMatrix.nerPoint.selectedWidth;

                    // _pos = gerRtoXY(cx, cy, r - 25, _angle);
                    // _selectedObj = {
                    //     'id': i,
                    //     'x': _pos.x,
                    //     'y': _pos.y,
                    //     'angle': _angle,
                    //     'word': _nerData[i].word,
                    // }
                }

                // _nerDic[_nerData[i].word.toLowerCase() + '_' + obj.tag] = obj;    // add to the dictionary
                _nerDic[_nerData[i].word.toLowerCase()] = _obj;    // add to the dictionary
                tmpObjs.push(_obj);
            }
        }
        return tmpObjs;
    }

    // document data
    var _getDocData = function(cx, cy, r) {
        var tmpObjs = [];

        var _triPts = getTranglePoints(cx, cy, r)

        var _perDocXScale = d3.scaleLinear()
            .domain([0, _docData.length])
            .range([_triPts.p2x, _triPts.p1x]);
        var _perDocYScale = d3.scaleLinear()
            .domain([0, _docData.length])
            .range([_triPts.p2y, _triPts.p1y]);

        var _locDocXScale = d3.scaleLinear()
            .domain([0, _docData.length])
            .range([_triPts.p1x, _triPts.p3x]);
        var _locDocYScale = d3.scaleLinear()
            .domain([0, _docData.length])
            .range([_triPts.p1y, _triPts.p3y]);

        var _orgDocXScale = d3.scaleLinear()
            .domain([0, _docData.length])
            .range([_triPts.p2x, _triPts.p3x]);

        for (var i=0; i<_docData.length; i++) {
            var _docId = _docData[i].id;

            var _perObj = {
                'id': _docId,
                'x': _perDocXScale(i) - 5,
                'y': _perDocYScale(i) - 5,
                'color': radialMatrix.colors.PER,
                'size': 2,
                'width': 0
            };
            var _locObj = {
                'id': _docId,
                'x': _locDocXScale(i) + 5,
                'y': _locDocYScale(i) - 5,
                'color': radialMatrix.colors.LOC,
                'size': 2,
                'width': 0
            };
            var _orgObj = {
                'id': _docId,
                'x': _orgDocXScale(i) + 5,
                'y': _triPts.p2y + 5,
                'color': radialMatrix.colors.ORG,
                'size': 2,
                'width': 0
            };

            // create path points
            if (_selectedDocs.includes(_docId) ||   // selected NERs
                    _docId === _selectedDocId ||    // selected document
                    _docId === _selectedSimId) {    // selected Similarity doc
                _perObj.size = _locObj.size = _orgObj.size = 3;

                for (var j=0; j<_docData[i].ner.length; j++) {
                    var key = _docData[i].ner[j];
                    var _obj = _nerDic[key];
                    if (_obj == null)
                        continue;

                    var _path = {};
                    if (_obj.tag == radialMatrix.tags.PER) {
                        _path['x1'] = _perObj.x;
                        _path['y1'] = _perObj.y;
                        _path['x2'] = _perObj.x - radialMatrix.curveMargin;
                        _path['y2'] = _perObj.y - radialMatrix.curveMargin;
                        _path['stroke'] = radialMatrix.colors.PER;
                    }
                    else if (_obj.tag == radialMatrix.tags.LOC) {
                        _path['x1'] = _locObj.x;
                        _path['y1'] = _locObj.y;
                        _path['x2'] = _locObj.x + radialMatrix.curveMargin;
                        _path['y2'] = _locObj.y - radialMatrix.curveMargin;
                        _path['stroke'] = radialMatrix.colors.LOC;
                    }
                    else if (_obj.tag == radialMatrix.tags.ORG) {
                        _path['x1'] = _orgObj.x;
                        _path['y1'] = _orgObj.y;
                        _path['x2'] = _orgObj.x;
                        _path['y2'] = _orgObj.y + radialMatrix.curveMargin;
                        _path['stroke'] = radialMatrix.colors.ORG;
                    }

                    _path['x3'] = _obj.innerX;
                    _path['y3'] = _obj.innerY;
                    _path['x4'] = _obj.cx;
                    _path['y4'] = _obj.cy;

                    _path['tag'] = _obj.tag;
                    _path['angle'] = _obj.angle;
                    _path['width'] = radialMatrix.docPath.normalWidth;
                    _path['alpha'] = _nerPathAlphaScale(_obj.freq);

                    // highlight path는 따로 표시하기! 나중에.
                    if(_obj.id == _selectedNerId) {
                        _path['stroke'] = radialMatrix.docPath.selectedColor;
                        _path['width'] = radialMatrix.docPath.selectedWidth;
                        _path['z_index'] = 1;
                        _path['alpha'] = 1;
                    }

                    // NER 연결된 링크를 뺀 나머지는 selected layer에서 보여줄 paths
                    if( !_selectedDocs.includes(_docId)) {
                        _path['stroke'] = radialMatrix.docPath.simSelectedColor;
                        _path['width'] = radialMatrix.docPath.simSelectedWidth;
                        _path['z_index'] = 1;
                        _path['alpha'] = 1;
                        _selectedSimNERPaths.push(_path);
                    }
                    else {
                        _nerPaths.push(_path);
                    }
                    // _nerPaths.push(_path);

                    // label setting, avid redundency.
                    if(!(key in _selectedLabels)) {
                        _pos = gerRtoXY(_obj.cx, _obj.cy, _obj.r + 3, _obj.angle);
                        // console.log(_pos);
                        var _selectedLabel = {
                            'id': i,
                            'x': _pos.x, //_obj.cx,
                            'y': _pos.y, //_obj.cy,
                            'angle': _obj.angle,
                            'word': _obj.word,
                            'anchor': 'start',
                            'font_weight': 'normal'
                        }
                        // _selectedLabels.push(_selectedLabel);

                        // rotate label
                        if (_obj.angle > 90 && _obj.angle < 270) {
                            _selectedLabel.anchor = 'end';
                            _selectedLabel.angle = _obj.angle + 180;
                        }

                        if(_obj.id == _selectedNerId) {
                            _selectedLabel.font_weight = 'bold';
                        }

                        if( !_selectedDocs.includes(_docId)) {
                            _selectedSimNERLabels[key] = _selectedLabel;
                        }
                        else {
                            _selectedLabels[key] = _selectedLabel;
                        }
                        // _selectedLabels[key] = _selectedLabel;
                    }
                }
            }

            if (_selectedDocId == _docId) {
                _perObj.size = _locObj.size = _orgObj.size = 3;
                _perObj.width = _locObj.width = _orgObj.width = 1;

                // console.log(_docData[i].ner);
            }

            // highlight selected Similarity docoments
            if (_selectedSimId == _docId) {
                _perObj.size = _locObj.size = _orgObj.size = 5;
                // console.log(_docData[i].ner);
            }

            tmpObjs.push(_perObj);
            tmpObjs.push(_locObj);
            tmpObjs.push(_orgObj);
        }

        return tmpObjs;
    }

    var _getDocText = function(docId) {
        var _text = _textData[docId];
        var _ners = _docData[docId].ner;
        for (var i=0; i<_ners.length; i++) {
            var _nerObj = _nerDic[_ners[i]];
            if (_nerObj == null) continue;  //pass null objects

            var _regex = new RegExp('[^\d\W\w]' + _ners[i], 'gi'); // gi case insensevity
            _text = _text.replace(_regex, "<mark class='mark_" + _nerObj.tag + "'>\$&</mark>")
        }
        
        var _obj = {
            'id': docId,
            'text': _text,
            'y': 0
        }

        if(_texts.length > 0) {
            _obj["y"] = 400;
        }

        if(_texts.length > 1) {
            _texts[1] = _obj;
        } else {
            _texts.push(_obj);
        }
    }


    var _getSimData = function(cx, cy, r) {
        var _triPts = getTranglePoints(cx + 3, cy + 2, r)   // calibrate sim dots 
        // var _triPts = getTranglePoints(cx, cy, r)   // calibrate sim dots 

        var _colorScale = d3.scalePow()
            .exponent(7)
            .domain([0, 1])
            .range(['lightgrey', 'darkgrey']);
        var _sizeScale = d3.scalePow()
            .exponent(7)
            .domain([0, 1])
            .range([1, 4]);

        var _selectedColorScale = d3.scalePow()
            .exponent(7)
            .domain([0, 1])
            .range(['yellow', 'red']);
        var _selectedSizeScale = d3.scalePow()
            .exponent(7)
            .domain([0, 1])
            .range([0, 7]);

        var _tmpXScale = d3.scaleLinear()
            .domain([0, _simData.length])
            .range([_triPts.p2x, _triPts.p3x]);

        var _simXScale = d3.scaleLinear()
            .domain([0, _simData.length])
            .range([_triPts.p2x, _triPts.p1x]);
            
        var _simYScale = d3.scaleLinear()
            .domain([0, _simData.length])
            .range([_triPts.p2y, _triPts.p1y]);

        var _xInterval = Math.abs(_simXScale(1) - _simXScale(0));
        var _tmpObjs = [];
        var _hightLightedObjs = [];
            
        for (var i=0; i<_simData.length; i++) {
            for (var j=1; j<_simData[i].length; j++) {

                var _dId = -1;
                for(var k=0; k<_selectedDocs.length; k++) {
                    if (_selectedDocs[k] == (i + 1000) || (_selectedDocs[k] == (i + j + 1000))) {
                        _dId = _selectedDocs[k] - 1000;
                        break;
                    }
                }

                // Show similarities of connected documents
                if (_dId > 0 ) {
                    var _obj = {
                        'id': i < _dId ? i : i+j,
                        'x': _simXScale(j),
                        'y': _simYScale(j),
                        'color': _colorScale(_simData[i][j]),
                        'r': _sizeScale(_simData[i][j])
                    }

                    _tmpObjs.push(_obj);
                }

                // Highlight selected document
                if ((_selectedDocId - 1000 == i) || (_selectedDocId - 1000 == i + j)) {
                    var _obj = {
                        'id': i < _selectedDocId - 1000 ? i : i+j,
                        'x': _simXScale(j),
                        'y': _simYScale(j),
                        'color': _selectedColorScale(_simData[i][j]),
                        'r': _selectedSizeScale(_simData[i][j])
                    }
                    _hightLightedObjs.push(_obj);
                    // _selectedSimPath.push([_obj.x, _obj.y]);    // get highlighted path points
                }

            }
            _simXScale = d3.scaleLinear()
                .domain([0, _simData[i].length - 1])
                .range([_tmpXScale(i + 1), _simXScale.range()[1] + _xInterval]);
                //.range([_xRange[0] + _xInterval, _xRange[1] + _xInterval]);

            _simYScale = d3.scaleLinear()
                .domain([0, _simData[i].length - 1])
                .range([_triPts.p2y, _simYScale(_simData[i].length - 1)]);

        }

        
        // get highlighted path points
        if(_hightLightedObjs.length > 0) {
            // _selectedSimPath.push([_hightLightedObjs[0].x, _hightLightedObjs[0].y]);
            // var _minY = -1;
            for (var i=0; i<_hightLightedObjs.length; i++) {
                // var _obj = _hightLightedObjs[i];
                // if(_obj.y - _minY <= 0) {
                //     // console.log(_obj.x, _obj.y);
                //     _selectedSimPath.push([_obj.x, _minY]);
                //     break;
                // }
                // _minY = _obj.y;

                // it makes closed shape, not a single path... why????
                _selectedSimPath.push([_hightLightedObjs[i].x, _hightLightedObjs[i].y]);

            }
            // _selectedSimPath.push([_hightLightedObjs[_hightLightedObjs.length-1].x, _hightLightedObjs[_hightLightedObjs.length-1].y]);
            // console.log(_selectedSimPath);

            // highlighted object to front
            Array.prototype.push.apply(_tmpObjs, _hightLightedObjs);
        }

        return _tmpObjs;
    }

    return {
        register: function(s) {
            _observers.add(s);
        },

        setScale: function(innerR) {
            return _setScale(innerR);
        },
        
        getNerData: function(cx, cy, r) {
            return _getNerData(cx, cy, r);
        },
        getDocData: function(cx, cy, r) {
            return _getDocData(cx, cy, r);
        },
        getSimData: function(cx, cy, r) {
            return _getSimData(cx, cy, r);

        },
        getSelectedLabel: function() {
            // return _selectedNerId > 0 ? [_selectedObj] : [];
            var _tmpArray = [];
            for (var key in _selectedLabels) {
                _tmpArray.push(_selectedLabels[key]);
            }
            return _tmpArray;
            // return _selectedNerId > 0 ? _selectedLabels : [];
        },
        getNerPath: function() {
            return _nerPaths;
        },
        getSelectedDocSimPath: function() {
            return [_selectedSimPath];
        },
        getSimNERLabels: function() {
            // return _selectedNerId > 0 ? [_selectedObj] : [];
            var _tmpArray = [];
            for (var key in _selectedSimNERLabels) {
                _tmpArray.push(_selectedSimNERLabels[key]);
            }
            return _tmpArray;
            // return _selectedNerId > 0 ? _selectedLabels : [];
        },
        getSimNerPaths: function() {
            return _selectedSimNERPaths;
        },

        getNerOptions: function() {
            return {
                'PER': _persons,
                'LOC': _locations,
                'ORG': _organizations
            };       
        },

        getText: function() {
            return _texts;
        },

        ner_selected: function(nerId) {
            _selectedDocId = -1;
            _selectedNerId = nerId;
            _selectedDocs = _nerData[_selectedNerId].doc;
            _nerPaths = [];
            _selectedSimPath = [];
            _selectedLabels = {};
            _selectedSimNERPaths = []
            _observers.notify();
        },
        doc_selected: function(docId) {
            _selectedDocId = docId;
            _selectedSimPath = [];
            _nerPaths = [];
            // console.log(docId);
            // _selectedDocs.push(docId);
            _selectedSimNERPaths = [];
            _selectedSimNERLabels = {};
            _observers.notify();
        },
        doc_clicked: function(docId) {
            docId = docId - 1000
            _texts = [];
            _selectedSimNERPaths = [];
            _selectedSimNERLabels = {};
            _nerPaths = [];
            _getDocText(docId);
            _observers.notify();
        },
        sim_doc_selected: function(docId) {
            _selectedSimId = docId + 1000;
            _selectedSimNERPaths = [];
            _selectedSimNERLabels = {};
            _nerPaths = [];
            _observers.notify();
        },
        sim_doc_clicked: function(docId) {
            // console.log(_selectedDocId);
            // if (_texts.length > 0) {
            //     _getDocText(docId);
            //     _selectedSimNERPaths = [];
            //     _selectedSimNERLabels = {};
            //     _nerPaths = [];
            //     _observers.notify();
            // }
            _selectedSimNERPaths = [];
            _selectedSimNERLabels = {};
            _nerPaths = [];
            if (_texts.length == 0) {
                _getDocText(_selectedDocId - 1000);
            }
            _getDocText(docId);
            _observers.notify();
        },
        sim_mouseout: function() {
            _selectedSimId = -1;
            _selectedSimNERPaths = [];
            _selectedSimNERLabels = {};
            _nerPaths = [];
            _observers.notify();
        },


    } 
}



var createRadialMatrixView = function(elm, model) {

	var _observers = makeSignaller();

    var _svg = d3.select('#' + elm);
    _svg.selectAll('*').remove();   //remove all elements when reloads
    var _width = _svg.node().clientWidth;
    var _height = _svg.node().clientHeight;

    var _cx = _width / 2;
    var _cy = _height / 2;
    var _r = _cy - radialMatrix.radialMargin.outer;
    var _innerR = _height/2 - radialMatrix.radialMargin.inner;

    // selection flags
    var _isNerSelected = false;
    var _isDocSelected = false;
    var _isSimDocSelected = false;

    _svg.on('click', function() {
        _isNerSelected = false;
        _isDocSelected = false;
        _isSimDocSelected = false;

        _svg.select('#circleSelectionArea').remove();   // free outer circle selection
        _svg.select('#tringleSelectionArea').attr('fill-opacity', 0); // free outer triangle selection
        // _svg.select('#triangle').attr('fill-opacity', 0); // free inner triangle selection
    })

    // edge line type: curveBundle
    var lineGenerator = d3.line();
    lineGenerator.curve(d3.curveBundle.beta(0.7)); // d3.curveBundle.beta(0.5)

    model.setScale(_innerR);

    // // outter circle
    // _svg.append('circle')
    //     .attr('cx', _width/2)
    //     .attr('cy', _height/2)
    //     .attr('r', _height/2 - radialMatrix.radialMargin.outer)
    //     .attr('fill-opacity', 0)
    //     .attr('stroke', 'black');

    // // inner cirlce
    // _svg.append('circle')
    //     .attr('cx', _width/2)
    //     .attr('cy', _height/2)
    //     .attr('r', _height/2 - radialMatrix.radialMargin.inner)
    //     .attr('fill-opacity', 0)
    //     .attr('stroke', 'black');

    // Tag type labels around outer circle
    _svg.append('text')
        .attr('dx', 15)
        .attr('dy', 15)
        .append('textPath')
        .attr('class', 'NER_type')
        .attr('xlink:href', '#per_path')
        .attr('startOffset', '50%')
        .style('letter-spacing', 7)
        .style('fill', 'purple')
        .text('PERSON');

    _svg.append('text')
        .attr('dx', 15)
        .attr('dy', 15)
        .append('textPath')
        .attr('class', 'NER_type')
        .attr('xlink:href', '#loc_path')
        .attr('startOffset', '50%')
        .style('letter-spacing', 4)
        .style('fill', 'Chocolate')
        .text('LOCATION');

    _svg.append('text')
        .attr('dx', 15)
        .attr('dy', 15)
        .append('textPath')
        .attr('class', 'NER_type')
        .attr('xlink:href', '#org_path')
        .attr('startOffset', '50%')
        .style('fill', 'ForestGreen')
        .text('ORGANIZATION');

    var _pathLayer = _svg.append('g')
        .attr('class', 'NER_path');
    var _nerLayer = _svg.append('g');

    // Trangular matrix
    var _triangle = _svg.append('polygon')
        .attr('id', 'triangle')
        .attr('points', getTranglePath(_cx, _cy, _cy - radialMatrix.radialMargin.inner))
        .attr('fill-opacity', 0)
        .attr('stroke', 'black')
        .attr('stroke-width', 1)

    // Person Bar
    _svg.append('path')
        .attr('id', 'per_path')
        .attr('d', f_svg_ellipse_arc([_cx, _cy], [_cy - radialMatrix.radialMargin.outer, _cy - radialMatrix.radialMargin.outer],
            [150 + radialMatrix.radialMargin.arc , 120 - radialMatrix.radialMargin.arc * 2], 0))
        .attr('fill-opacity', 0)
        .attr('stroke', 'purple')
        .attr('stroke-width', 3)
    
    // Location Bar
    _svg.append('path')
        .attr('id', 'loc_path')
        .attr('d', f_svg_ellipse_arc([_cx, _cy], [_cy - radialMatrix.radialMargin.outer, _cy - radialMatrix.radialMargin.outer],
            [270 + radialMatrix.radialMargin.arc , 120 - radialMatrix.radialMargin.arc * 2], 0))
        .attr('fill-opacity', 0)
        .attr('stroke', 'Chocolate')
        .attr('stroke-width', 3)

    // Organization Bar
    _svg.append('path')
        .attr('id', 'org_path')
        .attr('d', f_svg_ellipse_arc([_cx, _cy], [_cy - radialMatrix.radialMargin.outer, _cy - radialMatrix.radialMargin.outer],
            [30 + radialMatrix.radialMargin.arc , 120 - radialMatrix.radialMargin.arc * 2], 0))
        .attr('fill-opacity', 0)
        .attr('stroke', 'ForestGreen')
        .attr('stroke-width', 3)


    var _personArea = _svg.append('g')
            .attr('transform', function() {
                return 'translate(' + gerRtoXY(_cx, _cy, _r, 180).x + 
                    ', ' + radialMatrix.radialMargin.outer + ')';
            });

    var _locationArea = _svg.append('g')
            .attr('transform', function() {
                return 'translate(' + gerRtoXY(_cx, _cy, _r, 270 + radialMatrix.radialMargin.arc).x + 
                    ', ' + radialMatrix.radialMargin.outer + ')';
            });

    var _organizationArea = _svg.append('g')
            .attr('transform', function() {
                return 'translate(' + gerRtoXY(_cx, _cy, _r, 150 - radialMatrix.radialMargin.arc).x + 
                    ', ' + gerRtoXY(_cx, _cy, _r, 150 - radialMatrix.radialMargin.arc).y + ')';
            });

    // NER (outer circle) voronoi selection area
    var _outerCircle = _svg.append('g').attr('transform', 'translate(' + _width / 2 + ',' + _height / 2 + ')');
    // var _outerDonut = _outerCircle.append('path')
    //     .attr('id', 'circleSelectionArea')
    //     .attr('d', d3.arc()
    //         .innerRadius(_height/2 - radialMatrix.radialMargin.outer)
    //         .outerRadius(_height/2 - radialMatrix.radialMargin.outer + radialMatrix.nerPoint.max)
    //         .startAngle(0)
    //         .endAngle(Math.PI*2)
    //     )
    //     .attr('fill', 'black')
    //     .style('opacity', 0.2)

    // document voronoi selection area
    var _t1 = getTranglePoints(_cx, _cy, _cy - radialMatrix.radialMargin.inner);
    var _t2 = getTranglePoints(_cx, _cy, _cy - radialMatrix.radialMargin.outer + 10);
    var _tPoligon = [[_t2.p1x, _t2.p1y], [_t2.p2x, _t2.p2y], [_t2.p3x, _t2.p3y], [_t2.p1x, _t2.p1y],
    [_t1.p1x, _t1.p1y], [_t1.p3x, _t1.p3y], [_t1.p2x, _t1.p2y], [_t1.p1x, _t1.p1y]].join(' L').replace(/\,/g, ' ');
    var _outerTriangle = _svg.append('g').append('path')
        .attr('id', 'tringleSelectionArea')
        .attr('d', 'M' + _tPoligon + 'Z')
        .attr('fill', 'black')
        .attr('fill-opacity', 0)
        // .attr('stroke', 'red')
        // .attr('stroke-width', 1)


    // Voronois
    // var _nerVoronoi = d3.voronoi()
    //     .x( d => d.cx2 )
    //     .y( d => d.cy2 )
    //     // .x( d => d.centerX )
    //     // .y( d => d.centerY )
    //     .extent([[0, 0], [_width, _height]]);

    var _simVoronoi = d3.voronoi()
        .x( d => d.x )
        .y( d => d.y )
        .extent([[0, 0], [_width, _height]]);

    var _docVoronoi = d3.voronoi()
        .x( d => d.x )
        .y( d => d.y )
        .extent([[0, 0], [_width, _height]]);


    var _simLayer = _svg.append('g');
    var _labelLayer = _svg.append('g');

    var _selectedLayer = _svg.append('g');
    var _docLayer = _svg.append('g');


    var _drawSelected = function() {
        _simNerLables = model.getSimNERLabels();
        _simNerPaths = model.getSimNerPaths();

        var _label = _selectedLayer.selectAll('text')
            .data(_simNerLables);
        var _path = _selectedLayer.selectAll('path')
            .data(_simNerPaths);

        _path.enter().append('path')
            .attr('d', d => { return lineGenerator([[d.x1, d.y1], [d.x2, d.y2], [d.x3, d.y3], [d.x4, d.y4]]); })
            .attr('fill', 'none')
            .attr('stroke', d => d.stroke)
            .attr('stroke-dasharray', 4)
            .attr('stroke-width', d => d.width)

        _label.enter().append('text')
            .attr('class', 'label')
            .text(d => d.word)
            .attr('transform', function(d) {
                return 'translate(' + d.x + ', ' + d.y + ') rotate(' + (d.angle + 0)+ ')';
            })
            .style('text-anchor', d => d.anchor)
            .style('font-weight', d => d.font_weight)

        _path
            .attr('d', d => { return lineGenerator([[d.x1, d.y1], [d.x2, d.y2], [d.x3, d.y3], [d.x4, d.y4]]); })
            .attr('fill', 'none')
            .attr('stroke', d => d.stroke)
            .attr('stroke-dasharray', 4)
            .attr('stroke-width', d => d.width);

        _label
            .text(d => d.word)
            .attr('transform', function(d) {
                return 'translate(' + d.x + ', ' + d.y + ') rotate(' + (d.angle + 0)+ ')';
            })
            .style('text-anchor', d => d.anchor)
            .style('font-weight', d => d.font_weight)

        // exit()
        _path.exit().remove();
        _label.exit().remove();

    }



    // render view
    var _draw = function() {
        _nerData = model.getNerData(_cx, _cy, _r);
        _simData = model.getSimData(_cx, _cy, _innerR);        
        _docData = model.getDocData(_cx, _cy, _innerR);

        _selectedLabelData = model.getSelectedLabel();

        _nerPathData = model.getNerPath();
        _simPathData = model.getSelectedDocSimPath();

        _drawSelected();

        var _nerBars = _nerLayer.selectAll('path')
            .data(_nerData);
        var _nerPaths = _pathLayer.selectAll('path')
            .data(_nerPathData);
        var _label = _labelLayer.selectAll('text')
            .data(_selectedLabelData);
        var _docs = _docLayer.selectAll('circle')
            .data(_docData);
        var _sims = _simLayer.selectAll('circle')
            .data(_simData);
        var _simPaths = _simLayer.selectAll('path')
            .data(_simPathData);

        // show ner voronoi lines
        // var _nerVoronoiPoligon = _svg.selectAll('path')
        //     .data(_nerVoronoi(_nerData).polygons())
        //     .enter().append('path')
        //     .attr('fill', 'none')
        //     .attr('stroke', 'black')
        //     .attr('d', d => {
        //         if (d)
        //             return `M${d.join('L')}Z`
        //     });

        // show sim docs voronoi
        // var _simVoronoiArea = _svg.append('g');
        // var _simVoronoiPoligon = _simVoronoiArea.selectAll('path')
        //     .data(_simVoronoi(_simData).polygons());
        
        // _simVoronoiPoligon.enter().append('path')
        //     .attr('fill', 'none')
        //     .attr('stroke', 'black')
        //     .attr('d', d => {
        //         if (d)
        //             return `M${d.join('L')}Z`
        //     });
        // _simVoronoiPoligon 
        //     .attr('d', d => {
        //         if (d)
        //             return `M${d.join('L')}Z`
        //     });       
        // _simVoronoiPoligon.exit().remove();
           


        // NER voronoi
        // _outerDonut.on('mouseover', function() {
        //     if (_isNerSelected)
        //         return;
        //     var [mx, my] = d3.mouse(this);
        //     mx = mx + (_width/2);
        //     my = my + (_height/2);
        //     var site = _nerVoronoi(_nerData).find(mx, my, 150);
        //     if (site) {
        //         _observers.notify({
        //             type: radialMatrix.signals.NER_SELECTED,
        //             id: site.data.id
        //         });
        //     }
        // });

        // Sim voronoi
        _triangle
            // .on('mouseover', function() {
            //     if (_isSimDocSelected) return;
            //     var [mx, my] = d3.mouse(this);
            //     var site = _simVoronoi(_simData).find(mx, my, 10);
            //     if (site) {
            //         _observers.notify({
            //             type: radialMatrix.signals.SIM_DOC_SELECTED,
            //             id: site.data.id
            //         })
            //     }
            // })
            .on('mouseout', function() {
                _observers.notify({
                    type: radialMatrix.signals.SIM_MOUSEOUT
                });
            })

        // Document voronoi
        _outerTriangle
            .on('mouseover', function() {
                if (_isDocSelected) return;
                var [mx, my] = d3.mouse(this);
                var site = _docVoronoi(_docData).find(mx, my, 50);
                if (site) {
                    _observers.notify({
                        type: radialMatrix.signals.DOC_SELECTED,
                        id: site.data.id
                    })
                }
            })

                    
        // enter
        _nerBars.enter().append('path')
            .attr('d', d => {
                var out = d3.line()([[d.cx, d.cy], [d.cx2, d.cy2]]);
                return out;
            })
            .attr('stroke', d => d.color)
            .attr('stroke-width', d => d.width)
            .on('click', function(d) {
                d3.event.stopPropagation();
                _isNerSelected = true;
                _isDocSelected = false;
                _isSimDocSelected = false;

                var _outerDonut = _outerCircle.append('path')
                    .attr('id', 'circleSelectionArea')
                    .attr('d', d3.arc()
                        .innerRadius(_height/2 - radialMatrix.radialMargin.outer)
                        .outerRadius(_height/2 - radialMatrix.radialMargin.outer + radialMatrix.nerPoint.max)
                        .startAngle(0)
                        .endAngle(Math.PI*2)
                    )
                    .attr('fill', 'black')
                    .style('opacity', radialMatrix.selectedOpacity)
            })
            .on('mouseover', function(d, i) {
                if (_isNerSelected) return;
                _observers.notify({
                    type: radialMatrix.signals.NER_SELECTED,
                    id: d.id
                });
            })

        _nerPaths.enter().append('path')
            .attr('class', 'NER_path')
            .attr('d', d => { 
                return lineGenerator([[d.x1, d.y1], [d.x2, d.y2], [d.x3, d.y3], [d.x4, d.y4]]);
            })
            .attr('fill', 'none')
            .attr('stroke', d => d.stroke)
            .attr('stroke-width', d => d.width)
            .attr('stroke-opacity', d => d.alpha)
            .attr('z-index', function(d) {
                return d.z_index ? d.z_index : 10;
            })

        _label.enter().append('text')
            .attr('class', 'label')
            .text(d => d.word)
            .attr('transform', function(d) {
                return 'translate(' + d.x + ', ' + d.y + ') rotate(' + (d.angle + 0)+ ')';
            })
            .style('text-anchor', d => d.anchor)
            .style('font-weight', d => d.font_weight)
            // .style('stroke', 2);

        _docs.enter().append('circle')
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .attr('r', d => d.size)
            .attr('fill', d => d.color)
            .attr('stroke', 'black')
            .attr('stroke-width', d => d.width)
            .on('click', function(d) {
                d3.event.stopPropagation();
                _isDocSelected = true;
                _isSimDocSelected = false;
                _svg.select('#tringleSelectionArea')
                    .attr('fill-opacity', radialMatrix.selectedOpacity);
                _observers.notify({
                        type: radialMatrix.signals.DOC_CLICKED,
                        id: d.id
                });
            })
            .on('mouseover', function(d, i) {
                if (_isSimDocSelected) return;
                _observers.notify({
                    type: radialMatrix.signals.DOC_SELECTED,
                    id: d.id
                });
            });


        _simPaths.enter().append('path')
            .attr('d', d => {
                var out = d3.line()(d);
                return out;
            })
            .attr('fill', 'none')
            .attr('stroke', 'lightgrey')
            .attr('stroke-width', 1)


        _sims.enter().append('circle')
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .attr('r', d => d.r)
            .attr('fill', d => d.color)
            .on('mouseover', function(d, i) {
                d3.select(this)
                    .attr('stroke', 'black')
                    .attr('z-index', 1);
                // if (_isSimDocSelected) return;
                _observers.notify({
                    type: radialMatrix.signals.SIM_DOC_SELECTED,
                    id: d.id
                });
            })
            .on('mouseout', function() {
                d3.select(this).attr('stroke', 'none');
                _observers.notify({
                    type: radialMatrix.signals.SIM_MOUSEOUT
                });
            })
            .on('click', function(d) {
                d3.event.stopPropagation();
                _isSimDocSelected = true;
                // _svg.select('#triangle').attr('fill-opacity', radialMatrix.selectedOpacity)
                _observers.notify({
                    type: radialMatrix.signals.SIM_DOC_CLICKED,
                    id: d.id
                });
            })
            

        

        // update
        _nerPaths
            .attr('class', 'NER_path')
            .attr('d', d => { 
                return lineGenerator([[d.x1, d.y1], [d.x2, d.y2], [d.x3, d.y3], [d.x4, d.y4]]); 
            })
            .attr('fill', 'none')
            .attr('stroke', d => d.stroke)
            .attr('stroke-width', d => d.width)
            .attr('stroke-opacity', d => d.alpha)
            .attr('z-index', function(d) {
                return d.z_index ? d.z_index : 10;
            })


        _nerBars
            .attr('stroke-width', d => d.width)

        _label
            .attr('class', 'label')
            .text(d => d.word)
            .attr('transform', function(d) {
                return 'translate(' + d.x + ', ' + d.y + ') rotate(' + (d.angle + 0)+ ')';
            })
            .style('text-anchor', d => d.anchor)
            .style('font-weight', d => d.font_weight)

        _docs
            .attr('r', d => d.size)
            .attr('stroke-width', d => d.width);

        _simPaths
            .attr('d', d => {
                var out = d3.line()(d);
                // console.log(out);
                return out;
            })
            .attr('fill', 'none')

        _sims
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .attr('r', d => d.r)
            .attr('fill', d => d.color);

        // exit
        _nerBars.exit().remove();
        _nerPaths.exit().remove();
        _label.exit().remove();
        _simPaths.exit().remove();
        _sims.exit().remove();
        _docs.exit().remove();

    }

    return {
		register: function(s) {
	    	_observers.add(s);
		},
		render: function() {
			_draw();
		}
    }
}



var createSelectionView = function(elm, model) {

    var _observers = makeSignaller();

    var changed = function() {
        _observers.notify({
            type: radialMatrix.signals.NER_SELECTED,
            id: d3.select(this).property('value')
        });
    }

    var _perSelect = d3.select('#perSelect')
        .attr('name', 'Person-Names')
        .on('change', changed);
    var _locSelect = d3.select('#locSelect')
        .attr('name', 'Location-Names')
        .on('change', changed);
    var _orgSelect = d3.select('#orgSelect')
        .attr('name', 'Organization-Names')
        .on('change', changed);

    // Range slider
    // ref: https://bl.ocks.org/johnwalley/e1d256b81e51da68f7feb632a53c3518
    // var _svg = d3.select('#' + elm);
    var _svg = d3.select('#' + elm);
    // var _svg = d3.select('div#slider-range')
    //     .append('svg')
    //     .attr('width', 150)
    //     .attr('height', 100)


    var gRange = _svg.append('g')
        .attr('width', 150)
        .attr('height', 150)
        .attr('transform', 'translate(30,40)');

    var _label = _svg.append('text')
        .attr('transform', 'translate(55, 15)')
        .text('Entity Frequency')

    var _minText = gRange.append('text')
        .attr('class', 'sliderLabel')
        .attr('transform', 'translate(-10, -15)')
        .text(radialMatrix.ner_range.current_min)
    var _maxText = gRange.append('text')
        .attr('class', 'sliderLabel')
        .attr('transform', 'translate(150, -15)')
        .text(radialMatrix.ner_range.current_max)

    var sliderRange = d3.sliderBottom()
        .min(radialMatrix.ner_range.min)
        .max(radialMatrix.ner_range.max)
        .width(150)
        .ticks(5)
        .step(1)
        .default([radialMatrix.ner_range.current_min, radialMatrix.ner_range.current_max])
        .fill('#2196f3')
        .on('onchange', val => {
            var _min = parseInt(val[0])
            var _max = parseInt(val[1])

            _minText.text(_min)
            _maxText.text(_max)

            _observers.notify({
                type: radialMatrix.signals.SLIDER_CHNAGED,
                min: _min,
                max: _max
            });
        });

    gRange.call(sliderRange);


    
    var _draw = function() {
        var _data = model.getNerOptions();

        var _perOptions = _perSelect.selectAll('option')
            .data(_data.PER)
            .enter().append('option')
            .attr('value', d => d.id)
            .text(d => d.word)
            .on('change', function(d) {
                _observers.notify({
                    type: radialMatrix.signals.NER_SELECTED,
                    id: d.id
                });
            })

        var _locOptions = _locSelect.selectAll('option')
            .data(_data.LOC)
            .enter().append('option')
            .attr('value', d => d.id)
            .text(d => d.word)
            .on('change', function(d) {
                _observers.notify({
                    type: radialMatrix.signals.NER_SELECTED,
                    id: d.id
                });
            })

        var _orgOptions = _orgSelect.selectAll('option')
            .data(_data.ORG)
            .enter().append('option')
            .attr('value', d => d.id)
            .text(d => d.word)
            .on('change', function(d) {
                _observers.notify({
                    type: radialMatrix.signals.NER_SELECTED,
                    id: d.id
                });
            })

    }

    return {
        register: function(s) {
            _observers.add(s);
        },
        render: function() {
            _draw();
        }
    }

}

var createTextView = function(elm, model) {
    var _observers = makeSignaller();
    var _svg = d3.select('#' + elm);
    _svg.selectAll('*').remove();   //remove all elements when reloads

    var _textLayer = _svg.append('g');
   
    var _drawText = function(text) {

        var _textData = model.getText();

        var _fg = _textLayer.selectAll('foreignObject')
            .data(_textData);

        _fg.enter().append('foreignObject')
            .attr("width", 400)
            .attr("height", 400)
            .attr('overflow', 'auto')
            .attr('transform', function(d) {
                return 'translate(0, ' + d.y + ')';
            })
          .append("xhtml:body")
            .style("font", "14px 'Helvetica Neue'")
            .html(d => d.text)


        _fg.select('body')
            .html(d => d.text);

        _fg.exit().remove();


    }

    return {
        register: function(s) {
            _observers.add(s);
        },
        render: function() {
            _drawText();
        }
    }

}
