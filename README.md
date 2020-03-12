# Visualization

To run the visualization, open `RadialMatrix.html` in your browser.


# UI story board

You can see UI story board in `storyboard.pptx`.


# Data parser

Before run the data parser, you will need to install spacy and english model to calculate similarity.
To install spacy and model:
```
pip install -U spacy  # install spacy
python -m spacy download en_core_web_lg #install model
```
You can find more information about spacy [here](https://spacy.io/usage).

To run data parser:
```
$ cd DataParser
$ DataParser> run.sh
```

It will produce `data.js` as well as `text files` in `text directory` and `ner.txt`.
The visualization in this milestone only uses `data.js`.
