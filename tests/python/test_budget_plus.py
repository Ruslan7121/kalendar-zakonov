"""Бюджет 615-9: блоки «по годам» и «Было → Стало» есть в данных и согласованы между собой."""
import os, sys, unittest
sys.path[:0] = [os.path.join(os.path.join(os.path.dirname(__file__), '..', '..', 'pipeline'), d) for d in ('lib', 'collect', 'merge', 'check')]
import common as C

num = lambda x: float(x.replace(' ', '').replace(',', '.'))


class BudgetPlus(unittest.TestCase):
    def test_blocks(self):
        b = C.get_block(open(os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'canvas.tsx')).read(), 'BUDGET')['615-9']
        y, w = b['y'], b['w']
        self.assertEqual(len(y['cols']), 5)
        rows = {r[0]: r for r in y['rows']}
        for i in range(5):  # дефицит = расходы − доходы (допуск на округление записки)
            d = num(rows['Расходы'][1][i]) - num(rows['Доходы'][1][i])
            self.assertAlmostEqual(d, num(rows['Дефицит'][1][i]), delta=0.2)
        for n, was, now, dl in w['rows']:
            self.assertEqual(num(now[0]), num(rows[n][1][2]))  # «стало» 2027 совпадает с таблицей по годам
            for a, c, p in zip(was, now, dl):
                self.assertEqual(p[0], '+' if num(c) >= num(a) else '−')


if __name__ == '__main__':
    unittest.main()
