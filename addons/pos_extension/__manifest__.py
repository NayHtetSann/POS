{
    'name': 'Pont Of Sale Extension',
    'version': '1.0.1',
    'category': 'Pont of Sale',
    'summary': "POS TIP",

    'description': """

Point Of Sale
======================================================
""",
    'depends': ['base', 'point_of_sale'
                ],
    'data': [
        'views/pos_view.xml',
        'views/view.xml',
    ],
    'qweb': [
        'static/src/xml/template.xml',
        'static/src/xml/view_pos.xml',
    ],
    'demo': [
    ],
    'images': [],
    'application': True,
    'installable': True,
    'auto_install': False,
}
